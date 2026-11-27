# Amar Nfser Hisab — Release 1.2.5 A+ Online & Account-Owned Patch

## Base Project

এই প্যাচটি Release 1.2.4 Full Project-এর ওপর তৈরি (যেখানে আগের Release 1.2.3 UI/Journey এবং Build Fix 01 ইতিমধ্যে অন্তর্ভুক্ত)। সরাসরি চলমান 1.2.4 Project Root-এ Apply করবে। আগের Patch আবার Apply করবে না।

## এই Release-এ

- Runtime Workspace JSON Snapshot বাদ; Tracker Record পৃথক authenticated `workspace_*` টেবিলে থাকে।
- অ্যাপ পুরোনো IndexedDB/Local Storage পড়ে বা নতুন Durable Data সেখানে লেখে না; শুধু নির্দিষ্ট পুরোনো Key/Database Cleanup-only মুছে দেয়।
- নতুন Master SQL আর `user_workspace_snapshots` তৈরি করে না।
- Existing Database-এর জন্য Migration 003 পুরোনো Snapshot Table ও RPC সরায়; Migration 002-এর relational data অক্ষত রাখে।
- Settings-এ Account Delete: বর্তমান পাসওয়ার্ড, `DELETE` নিশ্চিতকরণ, account-prefixed private files অপসারণ, তারপর Auth User Delete। Relational Account Data FK Cascade-এ মুছে যায়।
- Supabase schema-তে Account Cascade preflight check রয়েছে।
- কোনো নতুন package/dependency বা environment variable নেই।

## Apply

1. Project Folder ও Supabase-এর Backup রাখো।
2. ZIP Extract করে Release 1.2.4 Project Root-এ Replace করো; `.env.local` ও `.git` অক্ষত রাখবে।
3. `npm ci` এবং `npm run test:all`, `npm run typecheck`, `npm run lint`, `npm run build` চালাও।
4. Existing Database হলে আগে নিশ্চিত হও `002_relational_workspace.sql` সম্পূর্ণ সফল হয়েছে এবং Relational Row Count ঠিক আছে। তারপর `003_remove_legacy_snapshot.sql` একবার চালাও। এটি পুরোনো Snapshot Archive স্থায়ীভাবে Drop করবে।
5. নতুন/খালি Database হলে শুধু `MASTER_DATABASE_SETUP.sql` চালাও; 001/002/003 আলাদা চালাবে না।

## Account Delete

Settings → Account Delete-এ বর্তমান পাসওয়ার্ড দিয়ে পরিচয় নিশ্চিত করে `DELETE` লিখে Submit করতে হবে। এটি অপরিবর্তনীয়; অ্যাকাউন্টের Relational Data ও private account-prefixed files সরিয়ে দেয়। শুধু UI থেকে Account Delete করলেই সঠিক cleanup path চালু হয়; Auth Dashboard থেকে সরাসরি user delete করলে private Storage cleanup route চলবে না।

## Verification

এই প্যাকেজ প্রস্তুতের পরিবেশে ১০১টি Node `.mjs` regression/contract test পাস করেছে। `tsx` Dependency অনুপস্থিত থাকায় `tests/*.test.ts`, পূর্ণ TypeScript typecheck, ESLint এবং Next.js production build চালানো যায়নি। এগুলো তোমার Node.js 22 পরিবেশে যাচাই করতে হবে। Live Supabase migration বা account deletion চালানো হয়নি।
