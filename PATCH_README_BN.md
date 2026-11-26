# Amar Nfser Hisab — Release 1.2.3 UI & Journey Polish

এই প্যাচটি Release 1.2.2 + Build Fix 01-এর ওপর বসানোর জন্য। এটি পূর্ণ Project ZIP নয়।

## প্রয়োগ

1. বর্তমান Project Folder-এর সম্পূর্ণ Backup রাখুন।
2. ZIP-এর সব ফাইল `package.json` থাকা Project Root-এ Extract করে Replace করুন।
3. `.env.local` অপরিবর্তিত রাখুন।
4. Supabase SQL Migration প্রয়োজন নেই। এই Release-এ Database Schema বা RLS Policy পরিবর্তন করা হয়নি।
5. Node.js 22.x ব্যবহার করে চালান:

```powershell
npm ci
npm run verify:release
```

## এই Release-এ

- Dashboard ও আত্মশুদ্ধি Summary-কে সংক্ষিপ্ত করা হয়েছে; ১,৪৩৮ দিনের সংখ্যা UI-তে দেখানো হয় না।
- ৭১টি Stage-এর নাম নতুন করে সাজানো হয়েছে; ভাষা আত্মনিয়ন্ত্রণ, মনোযোগ, শৃঙ্খলা, অধ্যবসায় ও অগ্রগতিকে কেন্দ্র করে। কোনো ব্যক্তিগত অভ্যাসকে সরাসরি শিরোনামে প্রকাশ করা হয়নি।
- Stage তালিকায় Module, তারিখ, সময়কাল, অতিক্রান্ত দিন, বাকি দিন, অগ্রগতি ও অবস্থা দেখানো হয়।
- Duplicate Dashboard Back Bar সরানো হয়েছে; পেজ-ভিত্তিক একটি করে Dashboard return control রাখা হয়েছে।
- হাদিস বিস্তারিত পৃষ্ঠা থেকে একটিমাত্র Dashboard Return রাখা হয়েছে; হাদিসের তালিকা/বিভাগ থেকে পড়া যাবে।
- Mobile ও Desktop-এর Journey, Notification, Hadith, Footer ও Dashboard spacing/type scale উন্নত করা হয়েছে।
- নিষিদ্ধ মুহূর্তের কার্ডে AlAdhan-এর Sunrise/Sunset এবং সেগুলোর মধ্যবিন্দু থেকে Solar Noon reference দেখানো হয়। এটি পূর্ণ ফিকহি সময়সীমা বলে দাবি করা হয় না; হানাফি নির্দেশনায় নিষেধের সময়সীমা স্থান ও ঋতুভেদে পরিবর্তিত হতে পারে।

## যাচাইয়ের অবস্থা

- JavaScript `.mjs` Contract/Regression Tests: 88/88 PASS
- TypeScript/TSX Syntax Parse: 70 files, 0 syntax errors
- Full `tsc --noEmit`, ESLint ও Next.js Production Build: এই প্যাকেজ তৈরির পরিবেশে dependency installation অনুপস্থিত থাকায় চালানো যায়নি। আপনার Windows/Vercel পরিবেশে `npm run verify:release` দিয়ে যাচাই করতে হবে।
