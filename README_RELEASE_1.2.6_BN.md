# Amar Nfser Hisab — Release 1.2.6

## সংস্করণ

Release 1.2.6 হলো Release 1.2.5 A+ Account-Owned Online + Fix Patch 01-এর পরবর্তী সংশোধন। এই রিলিজে UI navigation, notification behavior, Settings profile, সালাত Entry workflow, date typography এবং React/TypeScript regression issues ঠিক করা হয়েছে।

## প্রধান পরিবর্তন

- Desktop-এ Sidebar বাদ দিয়ে পূর্ণ-প্রস্থ Top Tab Navigation; Mobile-এ Bottom Navigation রাখা হয়েছে।
- সব প্রধান Section-এর Heading ও Dashboard Return Button ছোট ও একই নকশায়।
- Login Public Page-এ ব্যক্তিগত Footer নেই; ভেতরের Page-এ © চিহ্নসহ কেন্দ্রিক Footer।
- Notification Detail Expansion বাদ; Notification চাপলে কাঙ্ক্ষিত Tracker/সালাত Entry খোলে। Panel খোলা থাকলে Background Scroll বন্ধ এবং বাইরে ক্লিক/Escape-এ বন্ধ হয়।
- Settings-এ Account Profile, Display Name, Email, Optional Phone এবং Logout। Settings UI-তে Account Delete নেই।
- Gregorian Date বাংলা Typography-তে প্রদর্শিত। নিষিদ্ধ সময়ের UI Panel বাদ; বাকি সালাত সময়সূচি অক্ষত।
- মাগরিব-ভিত্তিক হিসাবের তারিখে একবার সালাত Entry; রেকর্ড থাকলে নতুন Entry বন্ধ, Edit করা যায়।
- সালাতের বাসায়/একাকী আদায়ে অতিরিক্ত “সম্পূর্ণ আদায় হয়েছে কি না” প্রশ্ন নেই; নির্ধারিত ফরজ রাকাত ধরে Entry তৈরি হয়।
- Hadith selection Hydration-safe; Quick Note ও Journey Reward Draft-এ cascading State Effect সরানো হয়েছে।

## ডেটাবেস ও সংরক্ষণ

- কোনো Database Schema, RLS, RPC, SQL Migration বা durable data format পরিবর্তন করা হয়নি।
- Tracker data আগের মতো account-owned relational `workspace_*` টেবিলে সংরক্ষিত হয়।
- কোনো নতুন Dependency, Storage Bucket, Cron বা Edge Function যোগ করা হয়নি।
- `.env.local` অপরিবর্তিত থাকবে।

## ইনস্টলেশন

Release 1.2.5 + Fix Patch 01-এর Project Root-এ Fix Patch ZIP Extract করে Replace করো। তারপর Node.js 22.x-এ:

```powershell
npm ci
npm run verify:release
```

সব পরীক্ষা সফল হলে Git Commit/Push করে Vercel Preview Deployment যাচাই করো।

## যাচাইয়ের সীমা

এই প্যাকেজিং পরিবেশে 119টি `.mjs` Test এবং 18টি TypeScript Test পাস করেছে। 75টি TS/TSX ফাইলে Syntax Error পাওয়া যায়নি। Full TypeScript semantic check, ESLint, Next.js Production Build এবং Live Supabase পরীক্ষা এই পরিবেশে সম্পন্ন হয়নি। Production release-এর আগে সেগুলো তোমার প্রজেক্টে চালাতে হবে।
