# Bridge Cloudflare backend

Bridge remains hosted by GitHub Pages. This Worker provides only the APIs needed
for expiring scorecard links and Web Push reminder delivery.

## Resources

- Worker: `bridge-crm-api`
- D1: `bridge-crm-production`
- Allowed browser origin: `https://ileggett23.github.io`
- Public app: `https://ileggett23.github.io/bridge-crm/`

## Required secrets

Configure these with `wrangler secret put`; never commit their values:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Deploy

From this directory:

```sh
npx wrangler d1 migrations apply bridge-crm-production --remote
npx wrangler deploy
```

The Worker intentionally returns `404` for non-API routes. CRM records remain in
the user's browser. D1 stores only push subscriptions and schedules needed for
background delivery, plus sanitized shared scorecard snapshots.
