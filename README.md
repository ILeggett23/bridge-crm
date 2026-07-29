# Bridge CRM

Bridge is an iPhone-first prospecting CRM hosted on GitHub Pages:

https://ileggett23.github.io/bridge-crm/

The static PWA stores anonymous CRM data locally and uses the Cloudflare Worker
under [`cloudflare/`](./cloudflare/) for background reminders, expiring
scorecards, and a guarded account/sync foundation. Cloud accounts remain
disabled until their private backup and transactional-email dependencies are
configured and verified.
