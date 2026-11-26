# Amar Nfser Hisab — Release 1.2.2 Patch

## এই প্যাচের ভিত্তি
এই প্যাচটি ব্যবহারকারীর আপলোড করা `Amar Nfser Hisab(1).zip` (package version `1.1.0`) এবং এতে থাকা আগের Fix 01 / Release 1.0 / 1.1 কাজের ওপর তৈরি। অন্য কোনো পুরোনো প্রজেক্টের ওপর বসাবে না।

## বসানোর নিয়ম
1. বর্তমান Project Folder এবং Supabase Database-এর Backup নাও।
2. ZIP-এর ফাইলগুলো বর্তমান Project Root-এ Extract করে Replace করো। `package.json` যেখানে আছে সেটিই Project Root।
3. `.env.local` অক্ষত রাখবে। ZIP-এ `.env.local`, কোনো Supabase Secret বা `node_modules` নেই।
4. পুরোনো generated `tsconfig.tsbuildinfo` থাকলে চাইলে মুছে দিতে পারো; TypeScript আবার তৈরি করবে।
5. Node.js 22.x ব্যবহার করে Dependency ও Release পরীক্ষা চালাও:

```powershell
npm ci
npm run verify:release
```

## Database Migration — গুরুত্বপূর্ণ

### বিদ্যমান Release 1.1 Database
- Supabase Database-এর Backup আগে নাও।
- যদি `002_relational_workspace.sql` আগে সফলভাবে চালানো না হয়ে থাকে, `supabase/migrations/002_relational_workspace.sql` একবার চালাও।
- এটি পুরোনো `user_workspace_snapshots` থেকে রেকর্ডগুলো আলাদা `workspace_*` টেবিলে কপি করে। পুরোনো Snapshot মুছে দেয় না; rollback/verification archive হিসেবে রাখে।
- যদি 002 ইতিমধ্যে সফলভাবে চালানো হয়ে থাকে, আবার চালানোর দরকার নেই।
- Migration-এর পরে `supabase/WORKSPACE_DATA_AUDIT_RELATIONAL.sql`-এ নিজের Login Email বসিয়ে তিনটি read-only Result Set পরীক্ষা করো।

### নতুন/খালি Supabase Project
- `supabase/MASTER_DATABASE_SETUP.sql` একবার চালাও। এতে Release 1.2 relational tables, RLS, RPC ও goal overlap trigger অন্তর্ভুক্ত আছে। আলাদাভাবে 001 বা 002 চালাবে না।

### Legacy Table সতর্কতা
Audit Query-এর শেষ Result Set-এ পুরোনো Relational Table-এর রেকর্ড সংখ্যা দেখাবে। এগুলো স্বয়ংক্রিয়ভাবে merge করা হয় না, কারণ Snapshot-এ একই তথ্য থাকলে Duplicate হতে পারে। কোনো Legacy Counter শূন্যের বেশি হলে পুরোনো টেবিল মুছবে না; আলাদা migration plan করে তারপর স্থানান্তর করবে।

## কী আপডেট হয়েছে
- নির্দিষ্ট ৭১টি Stage, ৩টি Module, ১,৪৩৮ দিনের হিসাব, ২৩ নভেম্বর ২০২৬ থেকে ৩০ অক্টোবর ২০৩০ পর্যন্ত পর্যায়সূচি এবং অনুভূতি/পুরস্কারের রেকর্ড।
- আলাদা Goal Tab, একাধিক Stage-এ Goal link, সংক্ষিপ্ত clickable Stage chip এবং Frontend ও Database-এ overlapping date-range প্রতিরোধ।
- ২০টি বাংলা অর্থানুবাদসহ Hadith-এর static JSON, বিস্তারিত পৃষ্ঠা ও reference map; কোনো Hadith API/Database call নেই।
- ইংরেজি Gregorian তারিখের পাশে বাংলা Hijri মাস; Maghrib-based date হিসাব অক্ষুণ্ণ।
- ইশার সময়সীমা, নিষিদ্ধ সময়, সরাসরি Tracker/Prayer Entry deep-link ও Notification confirmation flow আগের মতো রাখা হয়েছে।
- প্রতিটি প্রধান Section-এ Dashboard-এ ফেরার বোতাম; Tracker-এর ভেতরে তালিকা/পর্যায়ে ফেরার আলাদা বোতাম।
- Prayer Times cache-এর composite key-তে তারিখ ও অবস্থান; read-only Audit Query-তে সব workspace collection গণনা।
- Relational `workspace_*` টেবিলে per-record delta save; runtime-এ একক JSON Snapshot read/write নেই। Legacy Snapshot শুধু একবারের import ও rollback archive হিসেবে থাকে।

## পরীক্ষার সীমা
- ৭৮টি JavaScript Contract/Regression Test পাস করেছে।
- ১৮টি TypeScript Domain Test পাস করেছে (Node 22-এর type stripping দিয়ে আলাদাভাবে চালানো হয়েছে)।
- ৭৩টি TS/TSX source file-এ Syntax Check পাস করেছে।
- এই পরিবেশে `npm ci` network timeout হওয়ায় পূর্ণ `typecheck`, ESLint ও Next.js Production Build শেষ করা যায়নি। SQL Migration-ও Live Supabase Project-এ চালানো হয়নি। তোমার কম্পিউটারে `npm run verify:release` এবং Supabase-এ migration/audit পরীক্ষা করতে হবে।
