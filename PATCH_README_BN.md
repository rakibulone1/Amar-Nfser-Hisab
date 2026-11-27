# Amar Nfser Hisab — Release 1.2.4 Visual System Patch

## প্রযোজ্য Base

এই প্যাচটি Release 1.2.3 + Build Fix 01-এর ওপর তৈরি। একই প্রজেক্টের Root Folder-এ বসাবে, যেখানে `package.json` আছে।

## কী বদলেছে

- Desktop sidebar, topbar ও content frame-এর পরিমার্জন
- Mobile bottom navigation, safe-area spacing ও responsive grid
- Dashboard, journey, tracker, deadline, hadith, notification ও analytics card/list-এর সমন্বিত style
- Button, tab, input ও selection control-এর একক interaction language
- Light ও Dark theme-এর জন্য সমন্বিত semantic color palette
- Login এবং loading state-এর refinement
- Release metadata 1.2.4 এবং visual-system regression tests

## নিরাপদে Apply

1. চলমান প্রজেক্টের একটি Backup রাখো।
2. ZIP extract করে একই Project Root-এ ফাইলগুলো Replace করো।
3. `.env.local` এবং `.git` অপরিবর্তিত রাখবে।
4. কোনো SQL Migration চালানোর দরকার নেই। কোনো Supabase table, RLS policy, API contract বা data model পরিবর্তন করা হয়নি।
5. চালাও:

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

`npm run test:all`-এ `test:phase16` নতুনভাবে যুক্ত হয়েছে।

## Git Push

```powershell
git add .
git commit -m "ui: refresh the complete visual system"
git push origin main
```

Production branch `main` হলে Vercel স্বয়ংক্রিয়ভাবে নতুন deployment চালাবে।

## যাচাই সম্পর্কে

এই প্যাচ তৈরির পরিবেশে 94টি `.mjs` regression/contract test পাস করেছে এবং `globals.css` TinyCSS2 parser দিয়ে পরীক্ষা করে 0 parse error পাওয়া গেছে। Dependency installation offline cache-এ একটি অনুপস্থিত package-এর কারণে ব্যর্থ হওয়ায় পূর্ণ TypeScript typecheck, ESLint ও Next.js production build এখানে চালানো যায়নি। এগুলো তোমার Node.js 22 পরিবেশে চালাতে হবে।
