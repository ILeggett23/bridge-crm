# Bridge Web Rollback

Bridge v36 preserves the v34 release on both public hosting paths. Rollbacks
should redeploy an existing reference; they must not clear browser storage,
delete databases, or rewrite repository history.

## GitHub Pages

- Repository: `ILeggett23/bridge-crm`
- Preserved branch: `release/v34`
- Preserved public v34 commit: `8dc375287f4128ea79bc38c81ab1b78802a74924`

To restore GitHub Pages without rewriting history:

1. Create a normal rollback commit on `main` whose tree matches
   `release/v34`.
2. Push that new commit through the existing GitHub Pages workflow.
3. Verify the live site serves the v34 asset versions and loads past the
   launch screen.

Do not force-push `main` or delete the `release/v34` branch.

## ChatGPT Sites

- Project ID: `appgprj_6a62c0a345108191a211d3158c45b55e`
- Preserved v34 version ID:
  `appgprj_6a62c0a345108191a211d3158c45b55e~appgver_3e68be10f97c819183bd727227f3311a`
- Source commit: `8204ed7`

To restore Sites, deploy the preserved v34 saved version from the same project.
Do not create a replacement project, reuse a retired project, or delete newer
saved versions.

## Local Source

- Immutable annotated tag: `bridge-web-v34`
- Tagged commit: `8204ed7`

Use the tag to inspect or build v34. Keep new rollback work on a separate
branch or create a forward-moving rollback commit; do not reset the current
working branch destructively.

## Data Safety

Neither rollback path requires a data migration. Keep the existing
`localStorage`, IndexedDB, D1, notification subscription, and backup formats
intact. Export a JSON backup before any manual data operation.
