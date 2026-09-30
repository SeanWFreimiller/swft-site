# Deploying the capability-statement site

The public web version of `fractional/capability-statement.md`, hosted on Firebase Hosting.

## What's where

| Thing | Value |
|---|---|
| GCP / Firebase project | `swf-tech` (project number `366465193464`) |
| Google account | `sean.freimiller@gmail.com` |
| Hosting site ID | `swf-tech` |
| Staging URL | https://swf-tech.web.app |
| Custom domain | `swft.site` (registrar + DNS: GoDaddy) |
| Page source | `public/index.html` |

The gcloud account for this project is isolated in a named configuration called `swft`, so it
never touches the default config (which is a different Google account). Every gcloud command
here must be prefixed:

```bash
CLOUDSDK_ACTIVE_CONFIG_NAME=swft gcloud <...>
```

Firebase commands take `--account sean.freimiller@gmail.com --project swf-tech`.

## Editing the copy yourself

All the text lives in `public/index.html`. There's no build step, no templating, no framework —
what's in the file is what ships.

The file is in two halves:
- **Everything above `</style>` (~line 194) is CSS.** Design only. Leave it alone unless you mean
  to change how the page looks.
- **Everything below is the content.** Edit the words between the tags.

Where things are (line numbers drift as you edit — search for the text instead):

| What | Roughly |
|---|---|
| Tagline under the name | 201 |
| Headline | 213 |
| Positioning paragraphs | 214–223 |
| The six services | 228–283 |
| Selected Results cards | 287–315 |
| Advisory / Fractional / Project | 317–333 |
| Background block | 336–351 |

**Three things that will break the page if you get them wrong:**

1. **Don't touch the angle brackets.** Change `<h3>Interim &amp; Gap Coverage</h3>` to
   `<h3>Interim &amp; Transition Support</h3>` — keep `<h3>` and `</h3>` intact.
2. **Special characters are escaped.** A literal `&` must be typed `&amp;`, `>` must be `&gt;`,
   and `<` must be `&lt;`. Typing a bare `&` usually still renders, but a bare `<` will silently
   eat the rest of your sentence.
3. **The `·` separator** (in the tagline and Background) is a middot, not a period or hyphen.
   Copy an existing one rather than typing it.

Line breaks inside a paragraph don't matter — HTML collapses them. Break lines wherever is
readable in the editor; the page reflows on its own. A blank line does **not** create a new
paragraph; you need a new `<p>...</p>`.

### Previewing before you publish

Just open the file in a browser — there's no server needed, since the page has no JavaScript and
loads nothing externally:

```bash
open public/index.html
```

Edit, save, hit refresh. What you see is exactly what deploys.

## Deploying a change (GitHub, preferred)

This folder is its own GitHub repo. **Every push to `main` deploys to the live site** via
`.github/workflows/deploy.yml` (FirebaseExtended/action-hosting-deploy). No CLI needed: edit a file
on github.com (or have Claude push), and it's live in about a minute. Watch progress under the
repo's **Actions** tab; a red X means the deploy failed and the live site is unchanged.

The workflow authenticates with the repo secret `FIREBASE_SERVICE_ACCOUNT_SWF_TECH`: the JSON key
of a service account on `swf-tech` holding **Firebase Hosting Admin** and **API Keys Viewer**.

`public/usmc.html` is the Zion trip agenda (not part of the business site). `sw.js` and
`manifest.webmanifest` exist only to make that page installable and usable offline; the service
worker ignores every other page.

## Deploying a change (CLI, fallback)

From **this directory** (`fractional/site/` — the deploy fails elsewhere, since Firebase looks
for `firebase.json` in the current directory):

```bash
cd fractional/site
firebase deploy --only hosting --project swf-tech --account sean.freimiller@gmail.com
```

Takes a few seconds. The live page caches for 5 minutes, so hard-refresh (Cmd+Shift+R) if you
don't see the change.

Deploys are versioned and instantly rollback-able from the Firebase console
(Hosting → Release history → Rollback) — so a bad edit is never worse than a two-click undo.

**Keep `../capability-statement.md` in sync.** The markdown is the source of truth and is what
gets reused for PDFs and other formats; the HTML is one rendering of it. If you only fix the
wording in one place they'll drift.

This has actually happened: `Interim & Gap Coverage` lived in the markdown but was never added to
the page, and went unnoticed until 2026-08-11. Run this from `fractional/site/` before deploying
to catch a missing or renamed service:

```bash
python3 - <<'PY'
import re
md = open('../capability-statement.md', encoding='utf-8').read()
html = open('public/index.html', encoding='utf-8').read()
sec = md.split('### Services')[1].split('\n---')[0]
mds = re.findall(r'^\*\*(.+?)\*\*$', sec, re.M)
hs = [h.replace('&amp;', '&') for h in re.findall(r'<h3>(.*?)</h3>', html)][:len(mds)]
print("markdown:", len(mds), "| html:", len(hs))
for a, b in zip(mds, hs):
    print(("  ok  " if a == b else "  DIFF"), a, "" if a == b else f"|| {b}")
print("\nmismatched:", set(mds) ^ set(hs) or "none")
PY
```

It compares service headings only — it won't catch reworded body copy, so still eyeball the
paragraph you changed.

## Custom domain DNS (GoDaddy) — ✅ DONE, live as of 2026-08-11

`https://swft.site` serves the page with a Google Trust Services cert; `https://www.swft.site`
and `http://` both 301 to it. Certs auto-renew — no action needed.

The records below are recorded for reference / disaster recovery. Setting this up originally
required **removing** GoDaddy's parking A records on `@` (`76.223.105.230`, `13.248.243.5`); if
Forwarding/Parking is ever re-enabled on the domain, GoDaddy will re-add them and break the site.

**Add / change:**

| Type | Name | Value |
|---|---|---|
| A | `@` | `199.36.158.100` |
| TXT | `@` | `hosting-site=swf-tech` |
| TXT | `_acme-challenge` | `q4lUiEorcYsVeVfU1I2iElNTfSAajTlTyo_76JVaSt8` |
| CNAME | `www` | `swf-tech.web.app` (change existing — GoDaddy defaults it to `swft.site`) |
| TXT | `_acme-challenge.www` | `HphBnC1UrkyG1hlB_5e6vu9ZvzbKXGhz0V7cMNL8u9o` |

Enter names in short form (`@`, `_acme-challenge`, `www`, `_acme-challenge.www`) — GoDaddy
appends the domain automatically.

`www.swft.site` is registered as a **redirect** custom domain (`redirectTarget: swft.site`), so
it 301s to the apex rather than serving a duplicate copy of the page.

Firebase provisions the TLS certificate automatically once it sees the records. Usually under an
hour; Google documents up to 24 hours.

### Checking status

```bash
TOKEN=$(CLOUDSDK_ACTIVE_CONFIG_NAME=swft gcloud auth print-access-token)
curl -s "https://firebasehosting.googleapis.com/v1beta1/projects/swf-tech/sites/swf-tech/customDomains/swft.site" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: swf-tech" | python3 -m json.tool
```

Watch `hostState` (want `HOST_ACTIVE`) and `ownershipState` (want `OWNERSHIP_ACTIVE`).
The `_acme-challenge` TXT record can be deleted once the cert is issued, but leaving it costs
nothing and helps future renewals.

## Setup notes (already done — recorded in case it's ever repeated)

1. `gcloud auth login sean.freimiller@gmail.com`; `firebase login`
2. Enabled `firebase.googleapis.com` and `firebasehosting.googleapis.com` on `swf-tech`
3. **Firebase Terms of Service had to be accepted in the console before the API would work** —
   until then, `firebase projects:addfirebase` failed with a bare, undiagnostic
   `403 PERMISSION_DENIED` despite the account holding `roles/owner`. Accepting ToS at
   console.firebase.google.com (via "Create a project" → pick the existing `swf-tech`) fixed it.
   That console flow also created a stray empty project, `swft-c3962` ("FirstFirebaseProject"),
   which is unused and safe to delete.

## Content sourcing

`public/index.html` is the web rendering of `fractional/capability-statement.md` — same copy,
laid out for screen. Keep them in sync; the markdown remains the source of truth, and the same
rule applies as to resumes: every claim traces back to `career/`. The internal notes at the
bottom of the markdown (rates, open positioning decisions) are deliberately **not** in the
published page.

Differences from the markdown, deliberate:
- Phone number omitted (public, crawlable page — email and LinkedIn only).
- Selected Results renders as a card grid rather than a table, for mobile.

The page has no call-to-action block — one was drafted and dropped (2026-08-11). Contact is the
email address in the header and footer. Worth revisiting if the page starts getting traffic that
doesn't convert to conversations.
