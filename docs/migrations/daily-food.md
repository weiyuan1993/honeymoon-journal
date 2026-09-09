# Daily food schema cutover

Deploy the daily-food Worker and reset the live `美食推薦` tab in the same release window.
The old Worker must not write after the reset: it interprets columns C/D as price/content.

1. Build and verify the new code, then deploy it; keep food generation unused during cutover.
2. Re-read `美食推薦!A:E` to identify its occupied range.
3. Replace the header with `Day, City, Content, Preferences, UpdatedAt` and clear all existing data rows. The user authorized discarding legacy recommendations; no legacy conversion or backup is required.
4. Read back the header and cleared rows. Confirm the new API returns an empty map after its public cache expires.
5. Verify the empty-state generation entry point. Future updates upsert by Day only.

Do not restore the old Worker against the new schema. Reverting this release requires a coordinated schema change.
