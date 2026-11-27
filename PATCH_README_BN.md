# Amar Nfser Hisab — Release 1.2.7 Premium UI Cumulative Patch

## কোন সংস্করণে বসাবে

এই প্যাচটি পাবলিক GitHub `main`-এ পাওয়া বর্তমান **Release 1.2.5 A+ Account-Owned Online + Fix Patch 01**-কে Base ধরে তৈরি। এতে Release 1.2.6-এর মধ্যবর্তী সংশোধন এবং Release 1.2.7-এর নতুন UI উন্নয়ন একসঙ্গে অন্তর্ভুক্ত আছে। তাই আগে আলাদা করে Release 1.2.6 Patch বসাতে হবে না। একবারই এই প্যাচ বসাবে।

**Version Check:** তোমার Project Root-এর `package.json` প্রথমে `1.2.5` দেখাতে পারে। Fix Patch 01-এর সংশোধন/Tests থাকতে হবে। প্যাচ প্রয়োগের পরে package version হবে `1.2.7`।

## কী কী উন্নত হয়েছে

- Dashboard-এর Gregorian/Hijri Date Card কেন্দ্রে, বাংলা Typography ও compact pill layout।
- Section Header-এ একক Back Button, Eyebrow, Heading ও Action-এর একই visual rhythm। Stage Detail Header-ও একই Grid Rhythm ব্যবহার করে।
- Desktop Topbar/Primary Tabs-এর alignment, active state, sticky behavior এবং centered content canvas।
- Mobile Bottom Navigation safe-area-aware floating dock; বড় Touch Target ও পরিষ্কার Active State।
- Card family, Stage List, Hadith Reader, Tracker Panel, Button, Form এবং Interaction-এর shared design refinement।
- Light/Dark palette, focus indicator, keyboard accessibility ও reduced-motion support।

## পূর্বের ফিচার ও ডেটা অক্ষত

- Release 1.2.6-এর Notification routing, Profile/Logout, Compact Headers, Prayer Entry uniqueness/edit flow এবং Hadith/Stage fixes অন্তর্ভুক্ত।
- Supabase Relational Tables, RLS, RPC/API contract, Account Ownership ও `ON DELETE CASCADE` অপরিবর্তিত।
- Prayer, Qada, Maghrib Day, Journey, Goals, Hadith ও Notification business logic অপরিবর্তিত।
- কোনো SQL Migration, Table, নতুন Dependency, Environment Variable, Cron, Edge Function বা Storage Bucket নেই।

## Apply

1. বর্তমান Project Folder-এর Backup রাখবে।
2. ZIP Extract করে Project Root-এ Replace করবে—যেখানে `package.json` আছে।
3. `.env.local` এবং `.git` অক্ষত রাখবে।
4. Database SQL আবার চালানোর দরকার নেই।
5. Node.js 22.x ব্যবহার করে নিচের পরীক্ষা চালাবে।

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

## Validation

- JavaScript Contract/Regression Tests: ১২৬/১২৬ PASS।
- TypeScript Runtime Tests: ১৮/১৮ PASS (Node.js Type Stripping দিয়ে)।
- ৭২টি TS/TSX Source Parse: Syntax Diagnostic নেই।
- CSS PostCSS Parse: PASS।
- GitHub Base + Fix 01 + prior 1.2.6 layer + 1.2.7 patch: Clean Apply PASS।
- Patch ZIP ও Full ZIP Integrity: PASS।
- এই প্যাকেজিং পরিবেশে `tsc --noEmit`, ESLint ও Next.js Production Build চালানো হয়নি; পূর্ণ `node_modules` ইনস্টল ছিল না। তোমার PC-তে `npm ci`-এর পর এগুলো সফল না হওয়া পর্যন্ত Production Deploy করবে না।
