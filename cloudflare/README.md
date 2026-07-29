# Bridge Cloudflare backend

Bridge remains hosted by GitHub Pages. This Worker provides the hosted APIs for
expiring scorecard links, Web Push reminder delivery, and the guarded account,
sync, recovery, and backup foundation.

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
- `TURNSTILE_SECRET_KEY`
- `AUTH_HASH_PEPPER`

Cloud accounts deliberately remain gated with `AUTH_ENABLED=false` until the
private R2 `USER_BACKUPS` binding and a verified transactional email sender are
available and tested. See [ACCOUNT_DEPLOYMENT.md](./ACCOUNT_DEPLOYMENT.md) for
the activation checklist and rollback procedure.

## Deploy

From this directory:

```sh
npx wrangler d1 migrations apply bridge-crm-production --remote
npx wrangler deploy
```

The Worker intentionally returns `404` for non-API routes. With the account
gate disabled, CRM records remain in the user's browser. D1 retains push
subscriptions, reminder delivery records, sanitized shared scorecards, and the
empty user-isolated account schema prepared by the versioned migrations.
