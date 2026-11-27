# Release 1.3.0 — Mobile-first Workspace Experience

## Summary
A frontend-only experience refinement based on the 31 mobile screenshots supplied in Realview.zip and the Release 1.2.9 GitHub source.

## Changes
- Mobile-first spacing and component hierarchy across Dashboard, goals, trackers, hadith, notifications, and settings.
- Safe-area-aware floating bottom navigation with content clearance for the last controls.
- Clearer, deeper color surfaces by section; improved light/dark contrast.
- More readable mobile text, buttons, inputs, and card contents.
- Subtle section entrance and interaction motion with reduced-motion support.
- Visible sync label now uses status only; no time/date is shown.
- Background autosave success toast removed; failed saves remain visible.
- Refresh on the dashboard route clears transient section query state and returns to Dashboard.
- Section changes and browser history navigation scroll to top.
- Personal footer centered and copyright symbol removed.

## Preserved
- Existing tracker features and record operations.
- Supabase relational workspace and account-scoped data model.
- Authentication, notification logic, settings, and theme persistence.
- No database migration, API contract, or dependency change.

## Validation
Static source checks and CSS brace-balance check were performed. Regression test files were updated.
A full local dependency install, npm run verify:release, and Vercel production build were not run in this environment.
Do not treat the release as production-build-verified until Preview/Production deployment succeeds.