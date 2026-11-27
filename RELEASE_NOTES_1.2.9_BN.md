# Release 1.2.9 — Premium Responsive UI Upgrade

## লক্ষ্য
ডেস্কটপ ও মোবাইলের জন্য একীভূত, পরিশীলিত visual system তৈরি করা এবং ছোট স্ক্রিনে header/brand/controls-এর জায়গার সমস্যা সমাধান করা।

## Highlights

- Mobile Sync indicator now displays a compact time while preserving the full server-confirmed timestamp in its accessible description/tooltip.
- Rebalanced the mobile top bar so the product name remains visible before secondary identity details.
- Added responsive adjustments at 860px, 520px and 360px for navigation, cards, metric grids, content panels, tracker forms and bottom navigation.
- Reworked light and dark theme tokens with higher-contrast text, refined surfaces, semantic accent colors, border tones and layered shadows.
- Unified card treatment across dashboard, trackers, goals, stages, settings and Hadith views.
- Preserved notification, theme, settings, navigation and existing cloud-sync actions.
- Improved dark-theme primary-button contrast with a stronger foreground/surface pairing.
- Updated the main README and package manifest to identify the current 1.2.9 release.

## Compatibility

- Required base: Release 1.2.8 Experience Upgrade + Fix 01.
- No SQL migration.
- No database, RLS, RPC, API, authentication or Supabase data changes.
- No environment variable changes.
- No runtime/development dependencies added or upgraded.

## Validation

- JavaScript/MJS regression tests: 148 passed.
- TypeScript runtime tests under Node type stripping: 18 passed.
- TypeScript/TSX syntax validation: 77 files, zero syntax diagnostics.
- CSS stylesheet/declaration parsing: zero parser errors.
- Full semantic typecheck, ESLint and Next production build were not run in this environment because the project dependency tree was not installed.
