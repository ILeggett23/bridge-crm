# Bridge Cloud Accounts

## Current Status

Bridge now contains a guarded Cloudflare account, synchronization, backup, and
recovery foundation. It is **not enabled or deployed as a production login
system yet**.

`wrangler.jsonc` deliberately keeps:

```json
"AUTH_ENABLED": "false"
```

Do not change that value until the email sender, Turnstile widget, password
pepper, R2 bucket, D1 migrations, and end-to-end account tests are complete.
With the gate disabled, the existing GitHub Pages PWA continues to use its
local offline data without forcing users through an unfinished login flow.

This project uses only:

- GitHub Pages for the Bridge PWA
- A Cloudflare Worker for hosted API features
- Cloudflare D1 for structured account and sync data
- Cloudflare R2 for logical JSON backup objects once configured

ChatGPT Sites is not part of this architecture.

## Architecture

### Browser

- Existing anonymous CRM data remains in IndexedDB `bridge-crm`, store `state`,
  with the compatibility cache key `bridge-crm-cache`.
- Account data uses IndexedDB `bridge-account`.
- `bridge-account` stores:
  - `secure`: the opaque session credential
  - `states`: user-namespaced CRM snapshots
  - `sync`: per-user sync cursors and revision metadata
  - `mutations`: idempotent queued writes
- Authentication credentials are never written to localStorage.
- Signed-in state is namespaced by the authenticated user ID.
- The mutation queue survives reloads and retries after connectivity returns.

### Cloudflare Worker

The Worker exposes versioned `/api/v1` routes for:

- signup, login, logout, email verification, resend verification
- forgot/reset/change password
- session listing and revocation
- account profile, export, and deletion
- incremental sync pull and push
- safe local-data migration markers
- manual backup, backup listing/preview, and restore

Every private route derives ownership from the validated session. Client
supplied `user_id` values are not trusted. D1 operations use parameterized
queries and user-scoped record keys.

### D1

Migration `drizzle/0004_accounts_cloud_sync.sql` adds:

- users and hashed sessions
- verification and reset tokens
- database-backed rate limits
- user-owned CRM records with revisions and tombstones
- idempotent mutation receipts
- sync cursors and local-migration markers
- backup metadata
- ownership links for push subscriptions and scorecards

Migrations are versioned and must be applied with Wrangler. Do not manually
edit production tables.

### R2

Once the `USER_BACKUPS` binding is configured, logical JSON snapshots are
stored beneath server-generated user prefixes. Object keys never come from the
browser. Backups contain the normalized user-owned CRM state and a checksum.

Retention:

- regular automatic/manual backups: 90 days
- pre-delete recovery backup: 30 days

Restore requires the account password plus an explicit `RESTORE` confirmation.
The Worker validates ownership, checksum, and schema, then creates a
pre-restore snapshot before replacing data.

These are logical application backups, not a substitute for account-level D1
and R2 disaster-recovery policies.

## Security Decisions and Tradeoffs

### Session transport

The preferred browser model is an HttpOnly secure cookie. Bridge currently
serves its frontend from `ileggett23.github.io` and its API from a separate
`workers.dev` site. Safari's cross-site cookie restrictions make reliable
cookie sessions impractical for that deployment.

The current implementation therefore uses:

- a cryptographically random opaque bearer credential
- only the credential hash in D1
- the raw credential only in IndexedDB, never localStorage
- expiration, revocation, logout, and device-session controls
- strict origin allowlisting and no-store private responses

This is safer than localStorage but still browser-readable if same-origin
script execution is compromised. A future custom domain that places the PWA
and API under the same site should migrate sessions to HttpOnly, Secure,
SameSite cookies.

### Password hashing

Passwords use PBKDF2-HMAC-SHA-256 with unique random salts and 210,000
iterations because it is available in the Workers Web Crypto runtime without
shipping fragile native code. Passwords are never stored or logged.

PBKDF2 is deliberately slow but is not memory-hard. Before a broad production
launch, reassess a Workers-compatible Argon2id implementation and benchmark it
within Cloudflare CPU limits.

### Abuse controls

- Turnstile tokens are validated server-side when required.
- Signup, login, verification, and password recovery use D1-backed rate limits.
- Password recovery responses do not reveal whether an email exists.
- Security tokens are random, short-lived, single-use, and stored as hashes.
- Private JSON uses `Cache-Control: no-store`.
- Public scorecards retain token-based read-only sharing and owner association.

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the placeholder file:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Leave `AUTH_ENABLED=false` for ordinary CRM development.

4. Apply migrations to Wrangler's local D1 database:

   ```bash
   pnpm cloudflare:migrate:local
   ```

5. Run the Worker locally:

   ```bash
   pnpm cloudflare:dev
   ```

6. Run verification:

   ```bash
   pnpm test
   pnpm build
   pnpm cloudflare:deploy:dry
   ```

Local development may log verification/reset links only when the runtime is
explicitly in a non-production environment. It must never log passwords,
session credentials, password hashes, or reusable production tokens.

## Required Cloudflare Configuration

### 1. D1 migration

First create a D1 backup and validate the migration against a staging or local
copy. Then apply the migration remotely:

```bash
pnpm wrangler d1 migrations apply bridge-crm-production --remote
```

This is a remote data operation. Review the pending migration list and retain
the backup before confirming.

### 2. R2 backup bucket

Create a dedicated bucket:

```bash
pnpm wrangler r2 bucket create bridge-crm-user-backups
```

Add this binding to `wrangler.jsonc` only after the bucket exists:

```json
"r2_buckets": [
  {
    "binding": "USER_BACKUPS",
    "bucket_name": "bridge-crm-user-backups"
  }
]
```

Do not expose the bucket publicly. Backup reads and writes must remain behind
authenticated Worker routes.

### 3. Transactional email

Cloudflare Email Service requires a sender domain onboarded to Cloudflare DNS.
Configure an allowed sender and add:

```json
"send_email": [
  {
    "name": "EMAIL",
    "allowed_sender_addresses": [
      "no-reply@your-cloudflare-domain.example"
    ]
  }
]
```

Set non-secret variables:

```json
"AUTH_EMAIL_FROM": "no-reply@your-cloudflare-domain.example",
"AUTH_EMAIL_NAME": "Bridge CRM"
```

Do not enable signup until a real verification and password-reset email has
been delivered and its links have been tested on another device.

### 4. Turnstile

Create a Turnstile widget for the production GitHub Pages hostname and set the
public site key in Worker vars:

```json
"TURNSTILE_SITE_KEY": "your-site-key"
```

Store the secret interactively:

```bash
pnpm wrangler secret put TURNSTILE_SECRET_KEY
```

The Worker validates each token with Cloudflare. A browser-side success alone
is never treated as proof.

### 5. Password pepper

Generate a long random value and store it as a Worker secret:

```bash
pnpm wrangler secret put AUTH_HASH_PEPPER
```

Keep it in the production secret manager and an owner-controlled recovery
vault. Rotating it without a migration plan invalidates password verification.

## Activation Checklist

Complete all items before setting `AUTH_ENABLED=true`:

- [ ] D1 production backup retained
- [ ] migration tested locally and in staging
- [ ] remote D1 migration applied successfully
- [ ] private R2 bucket and binding verified
- [ ] scheduled backup object created and previewed
- [ ] restore tested with a disposable account
- [ ] email sender verified
- [ ] verification email delivered and consumed once
- [ ] password-reset email delivered without account enumeration
- [ ] Turnstile configured for the production hostname
- [ ] signup/login/reset rate limits exercised
- [ ] cross-account authorization tests pass
- [ ] offline mutation retries and revision conflicts tested on two devices
- [ ] local anonymous-data migration reviewed before upload
- [ ] account export inspected
- [ ] account deletion/recovery-retention behavior approved
- [ ] GitHub Pages CORS origin verified
- [ ] session expiration, logout, and revoke-other-session flows verified
- [ ] privacy and support copy reviewed

Then change the production variable to `AUTH_ENABLED=true`, run the complete
test/build/dry-run suite, deploy the Worker, and verify the configuration
endpoint before publishing frontend UI that requires login.

## Migration and Data Safety

Existing anonymous data is never uploaded automatically.

After login, Bridge:

1. detects local anonymous CRM data
2. previews record counts
3. requires explicit user confirmation
4. imports records under the authenticated user
5. records a migration marker for idempotency
6. keeps the local source until the upload is acknowledged

Retries use stable mutation IDs. A failed or interrupted import can resume
without duplicating records. The migration does not clear contacts, analytics,
streak history, follow-ups, places, settings, or achievements.

## Export, Restore, and Delete

- Export returns only the authenticated user's current CRM records.
- Backup listing and preview reveal only the current user's backup metadata.
- Restore requires password reauthentication and the word `RESTORE`.
- Account deletion requires password reauthentication and the word `DELETE`.
- Account deletion revokes sessions, push subscriptions, and scorecards.
- A time-limited pre-delete R2 snapshot is retained for recovery policy, while
  the account is anonymized and active private records are removed.
- No UI action silently deletes local anonymous data.

## Rollback

If account activation fails:

1. Set `AUTH_ENABLED=false` and deploy the Worker gate first.
2. Keep the migrated D1 tables; do not drop them during an incident.
3. Restore the last known-good Worker commit.
4. Leave GitHub Pages available in local/offline mode.
5. Revoke compromised sessions in D1 if relevant.
6. Restore D1/R2 only from verified platform or logical backups.
7. Diagnose with a disposable account before re-enabling signup.

Disabling the account gate does not erase browser-local CRM data or D1 data.
Never resolve an authentication incident by clearing every user's browser
storage.

## Production Deployment Boundary

`pnpm cloudflare:deploy:dry` validates the Worker package without publishing.

Only after every activation prerequisite is complete:

```bash
pnpm cloudflare:deploy
```

The repository should not claim cloud accounts are production-ready merely
because local tests pass. Production readiness requires real email delivery,
Turnstile, R2, remote migrations, cross-device sync, backup restoration, and
security testing against the deployed Worker.
