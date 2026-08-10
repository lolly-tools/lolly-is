# lolly.is

Short links for the Lolly project. A static GitHub Pages site: each slug is a tiny
page that logs an impression to a Google Sheet and instantly forwards to its
destination. The root of the domain is a hub page listing every link.

- `lolly.is/charts` → D3 Chart Studio
- `lolly.is/self-hosted` → install docs
- `lolly.is/different` → status quo page
- `lolly.is/` → hub page with all of the above
- unknown slugs → 404 page that shows the hub (and logs the bad path)

## Editing links

`links.json` is the single source of truth. Add an entry (slug, url, title,
description), push to `main`, and the workflow rebuilds and deploys. Add
`"hidden": true` to keep a link off the hub page while the slug still works.

Preview locally:

```sh
node build.js
python3 -m http.server -d dist 8080
```

## How impressions are logged

Each generated page fires `navigator.sendBeacon()` to a Google Apps Script web
app **before** redirecting — the beacon survives navigation, so there is no
delay for the visitor. Logged per visit: server timestamp, slug, destination,
referrer, languages, timezone, platform, screen size, user agent. No cookies,
no IP addresses (Apps Script never exposes them).

The beacon URL lives in `links.json` under `"beacon"`. While it's empty the
site works fine and simply doesn't log.

### One-time Google setup

1. Create a Google Sheet ([sheets.new](https://sheets.new)), name it e.g. *lolly.is clicks*.
2. **Extensions → Apps Script**, delete the stub, paste [`apps-script/Code.gs`](apps-script/Code.gs), save.
3. **Deploy → New deployment → ⚙ → Web app**:
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, authorise with your account (it only touches this sheet).
5. Copy the **Web app URL** (ends in `/exec`) into `"beacon"` in `links.json`, push.

To verify: open the `/exec` URL in a browser — it should say
`lolly.is logger is running`. After the site deploys, hit a short link and a
row should appear on the `clicks` tab.

Notes: the endpoint is public (anyone who finds it can append rows), there's no
bot filtering, and consumer Apps Script quotas allow roughly 20k executions/day
— all fine for this stage. Long-term plan is a self-hosted
[GoatCounter](https://www.goatcounter.com/) instead.

If you later edit `Code.gs`, redeploy with **Deploy → Manage deployments → ✎ →
Version: New version** — the `/exec` URL stays the same.

## Hosting setup (one-time)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Pages → Custom domain**: `lolly.is`, then tick **Enforce HTTPS**
   once the certificate is issued.
3. DNS for `lolly.is` (apex) — four A records:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   and optionally AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
   `2606:50c0:8002::153`, `2606:50c0:8003::153`.

## Known trade-offs (MVP)

- Client-side redirect: ~100–300 ms of branded "Taking you to…" before arrival;
  no-JS visitors follow a `<meta refresh>` fallback (unlogged).
- Crawlers see our page, not the destination — so each slug carries its own
  OG title/description and unfurls nicely.
- If we ever need real HTTP 302s, put the domain behind a Cloudflare Worker (or
  similar) that redirects and logs server-side — the short links themselves
  never change.
