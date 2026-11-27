# Amar Nfser Hisab — Release 1.2.8 Patch Guide

## Base Version
এই প্যাচটি GitHub-এর বর্তমান Release 1.2.7-এর ওপর বসানোর জন্য। এটি Incremental Patch; সম্পূর্ণ Project ZIP নয়।

## কী আপডেট হয়েছে
- Header-এর পুরোনো “অনলাইনে সংরক্ষিত” লেখার বদলে Database থেকে পাওয়া সর্বশেষ সফল সিঙ্কের সময় দেখায়।
- Dashboard/Settings-এর নিচের redundant Cloud Save footer note সরানো হয়েছে।
- Section Header-এ বামে Back, মাঝে ছোট Title Chip এবং ডানে Action-এর সমন্বিত Layout। অপ্রয়োজনীয় Eyebrow বাদ।
- Dashboard Date কেন্দ্রে; তারিখের রেঞ্জে দিন, পূর্ণ মাস ও সাল।
- লক্ষ্য Tab সমান প্রস্থে; ডিফল্ট আত্মশুদ্ধি। সামগ্রিক অগ্রগতির হিসাবের সূত্র সংক্ষেপে দেখানো।
- Dashboard Journey Card থেকে আত্মশুদ্ধি; পরবর্তী লক্ষ্য থেকে নির্দিষ্ট Goal Card-এ সরাসরি যাওয়া যায়।
- Goal Task-এর পৃথক Add, Edit, Complete/Undo ও Delete।
- Tracker History-তে Prayer-এর বিদ্যমান Edit-এর পাশাপাশি কুরআন, জিকির, সিয়াম, ভালো কাজ, ব্যক্তিগত লগ, ইলম, অভ্যাস, মুহাসাবা ও অতিরিক্ত সালাতের পৃথক Edit/Delete। বিদ্যমান Record ID আপডেট হয়; নতুন Duplicate Record তৈরি হয় না।
- Hadith Detail Reader-এর Header, Typography ও Reference ribbon উন্নত।
- Server-confirmed Save হলে সবুজ বাংলা Toast; Save ব্যর্থ বা Offline হলে লাল বাংলা Toast।
- Light/Dark Theme-এর সব নতুন UI উপাদান Responsive।

## বসানোর নিয়ম
1. বর্তমান Project Folder-এর Backup রাখো।
2. ZIP Extract করে একই Project Root-এ ফাইলগুলো Replace/Copy করো।
3. `.env.local` এবং `.git` ফোল্ডার অপরিবর্তিত রাখবে।
4. কোনো SQL Migration চালাতে হবে না। Database Schema, RLS, API Contract ও Relational Record Format পরিবর্তন করা হয়নি।
5. Node.js 22.x ব্যবহার করে নিচের কমান্ডগুলো চালাও।

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

সব পরীক্ষা সফল হলে Git Push:

```powershell
git add .
git commit -m "Release 1.2.8: polish workspace experience"
git push origin main
```

## সংরক্ষণ ও নোটিফিকেশন
- Green “সংরক্ষিত” Toast শুধু API থেকে Save সফল হওয়ার পর আসে।
- Network/Server/Session/Conflict সমস্যায় লাল বাংলা বার্তা আসে।
- Internet বিচ্ছিন্ন থাকলে পরিবর্তন Cloud-এ সংরক্ষিত হয়েছে বলে দেখানো হয় না।
- কুরআন/জিকির/সিয়াম/ভালো কাজ/ব্যক্তিগত লগ/ইলম/অভ্যাস/মুহাসাবা/অতিরিক্ত সালাতের Edit একই Record ID আপডেট করে।
- কাজা Settlement Ledger-এর ঐতিহাসিক নিষ্পত্তি রেকর্ডকে সাধারণ Edit Form দিয়ে পরিবর্তন করা হয় না; Settlement-এর নিরাপত্তা অক্ষত রাখা হয়েছে।

## যাচাইয়ের সীমা
এই প্যাকেজ প্রস্তুত করার পরিবেশে Dependency Installation নেটওয়ার্ক টাইমআউটে শেষ হয়নি। তাই পূর্ণ `tsc --noEmit`, ESLint ও Next.js Production Build এখানে যাচাই করা যায়নি। তবে Node.js JavaScript Regression Test, TS/TSX Syntax Parse এবং CSS Parse চালানো হয়েছে। Production Push-এর আগে নিজের পরিবেশে `npm run verify:release`/উপরের কমান্ডগুলো চালাবে।
