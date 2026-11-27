# Amar Nfser Hisab — Release 1.2.6 Fix Patch

## কোন সংস্করণের জন্য

এই প্যাচটি **Release 1.2.5 A+ Account-Owned Online + Fix Patch 01**-এর ওপর বসানোর জন্য। Release 1.2.4 বা তার আগের সংস্করণে বসাবে না। একই প্যাচ দ্বিতীয়বার প্রয়োগ করার দরকার নেই।

## এই প্যাচে কী আছে

1. মাগরিব-ভিত্তিক তারিখের Test-এ পুরোনো `getLocalJournalDate` নাম বাদ দিয়ে বর্তমান `getJournalDate` ব্যবহার। মূল তারিখ গণনার লজিক অপরিবর্তিত।
2. পুরোনো Journey Archive-এর Stage 3 নামের Backward Compatibility রাখা; নতুন ৭১টি Fixed Stage-এর নাম ও তারিখ অপরিবর্তিত।
3. হাদিস কার্ডের প্রথম নির্বাচন SSR/Hydration-safe করা; Effect-এ অপ্রয়োজনীয় State Update নেই।
4. Quick Note নতুন মাগরিব-ভিত্তিক দিনে সঠিকভাবে Reset হয়।
5. Stage Reward Draft-এর Server Data Synchronization React-এর guarded render update দিয়ে করা; cascading Effect সরানো।
6. Notification থেকে নির্দিষ্ট সালাত ও তারিখে সরাসরি Tracker Entry-তে যাওয়া; প্যানেল খোলা থাকলে ব্যাকগ্রাউন্ড Scroll বন্ধ এবং বাইরে ক্লিক/Escape-এ প্যানেল বন্ধ।
7. Section Heading-এর Back Button ছোট ও একক রাখা; Desktop-এ পূর্ণ-প্রস্থ Top Tabs এবং Mobile-এ Bottom Navigation বজায় রাখা।
8. Dashboard Gregorian Date বাংলা Typography-তে; নিষিদ্ধ সময়ের Panel সরানো।
9. Notification Detail Expansion বাদ; ক্লিক করলে নির্দিষ্ট Section/Entry খোলে।
10. Settings-এ Profile ও Logout; Settings UI থেকে Account Delete সরানো। Profile Server API যুক্ত।
11. সালাত Entry প্রতি মাগরিব-ভিত্তিক তারিখে একবার; আগে রেকর্ড থাকলে নতুন Entry নয়, Existing Entry Edit করা যাবে। বাসায়/একাকী আদায়ে অপ্রয়োজনীয় দ্বিতীয় Completion প্রশ্ন নেই।
12. Release metadata 1.2.6 এবং Regression Tests আপডেট।

## বসানোর নিয়ম

1. চলমান Project-এর Backup রাখো।
2. ZIP Extract করে Project Root-এ Replace করো—যেখানে `package.json` আছে।
3. `.env.local`, `.git` এবং Supabase Credentials অপরিবর্তিত রাখো।
4. **কোনো SQL Migration লাগবে না।** Database Schema, RLS, API Contract বা Durable Data Format পরিবর্তন করা হয়নি।
5. নতুন Dependency যোগ করা হয়নি; `package-lock.json`-এ শুধু Root Package Version 1.2.6 করা হয়েছে।

## পরীক্ষা

প্যাকেজিং পরিবেশে সরাসরি চালানো হয়েছে:

- Node `.mjs` Regression/Contract Tests: **119/119 PASS**
- TypeScript Runtime Tests: **18/18 PASS** (Node 22 native type stripping)
- TypeScript/TSX syntax transpilation: **75 files, 0 syntax errors**
- Patch Apply Test: Release 1.2.5 + Fix 01-এর clean copy-তে সফল
- ZIP Integrity: PASS

এখানে `npm ci` নেটওয়ার্ক টাইমআউটে অসম্পূর্ণ হয়েছে। তাই পূর্ণ `tsc --noEmit`, ESLint ও Next.js Production Build এই পরিবেশে চালানো যায়নি; এগুলো পাস হয়েছে বলে দাবি করা হচ্ছে না।

## তোমার কম্পিউটারে যাচাই

Node.js 22.x ব্যবহার করে:

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

Node.js 24.21.0 ব্যবহার করলে `engines: 22.x`-এর EBADENGINE Warning দেখা যেতে পারে; এটি নিজে Build Failure নয়। সামঞ্জস্যের জন্য Node.js 22.x ব্যবহার করো।
