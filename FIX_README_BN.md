# Amar Nfser Hisab — Release 1.2.8 Fix 01

## Base
বর্তমান Release 1.2.8 Experience Upgrade Patch সফলভাবে বসানো Project।

## সংশোধন
- `store.ts`-এ অনলাইন Save Feedback-এর `showAppToast` সঠিক relative import যোগ।
- `tracker-center.tsx`-এ `flushWorkspaceChanges`, `getCloudSyncState`, `getCloudSyncMessage`-এর সঠিক imports যোগ।
- `frontend-workspace.tsx`-এর unused imports, unused catch binding এবং JSX event handler-এর no-unused-expressions Warning ঠিক।
- `theme-provider.tsx`-এ unused catch parameter সরানো।
- `tracker-center.tsx`-এর unused `ScaleGlyph` সরানো।
- এই সমস্যাগুলো পুনরায় এড়াতে `phase22-build-fix.test.mjs` যোগ এবং `test:all`-এ যুক্ত।

## কী অপরিবর্তিত
- Supabase Schema, RLS, RPC ও API contract।
- Online relational save architecture এবং record IDs।
- Database data, prayer calculations, journey stages ও UI behavior।
- Dependencies, lockfile ও environment variables।

## প্রয়োগ
ZIP Extract করে Project Root-এ Replace করো। `.env.local` অপরিবর্তিত রাখবে। SQL Migration লাগবে না।

```powershell
npm run test:all
npm run typecheck
npm run lint
npm run build
```
