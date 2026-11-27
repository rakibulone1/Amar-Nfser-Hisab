# Amar Nfser Hisab — Release 1.2.9
## Premium Responsive UI Upgrade

### প্যাচের ভিত্তি
এই প্যাচটি নিচের দুটি প্যাচ সফলভাবে বসানো Release 1.2.8 প্রজেক্টের জন্য:

1. `Amar_Nfser_Hisab_Release_1.2.8_Experience_Upgrade_Patch.zip`
2. `Amar_Nfser_Hisab_Release_1.2.8_Fix_01_Patch.zip`

**শুধু Release 1.2.7 বা GitHub-এর পুরোনো `main` branch-এর উপর এই প্যাচ সরাসরি বসাবেন না।** আগে 1.2.8 Experience Upgrade এবং Fix 01 বসাতে হবে। বর্তমান GitHub `main` metadata-তে এখনও 1.2.7/1.2.5 ভিত্তির চিহ্ন আছে; সেই branch-কে এই প্যাচের base ধরে নেওয়া যাবে না।

### কী পরিবর্তন হয়েছে

- মোবাইলের Sync badge-এ পূর্ণ তারিখ-সময় সরিয়ে ছোট clock display করা হয়েছে। পূর্ণ timestamp ও sync state `title`/accessible label-এ থাকছে।
- ছোট স্ক্রিনে app brand-কে অগ্রাধিকার দিয়ে header-এর প্রস্থ পুনর্বিন্যাস করা হয়েছে; 520px-এর নিচে avatar লুকিয়ে notification, settings ও theme action-এর জায়গা রাখা হয়েছে।
- 860px, 520px এবং 360px breakpoint-এ header, content spacing, cards, metrics, forms, journey rows ও bottom navigation নতুনভাবে সামঞ্জস্য করা হয়েছে।
- Light ও Dark—দুই থিমের জন্য পৃথক forest/jade-ভিত্তিক palette, উন্নত surface hierarchy, text contrast, border ও shadow token যুক্ত হয়েছে।
- Dashboard hero, metric cards, journey cards, Hadith surface, navigation ও form controls-এ একই visual language প্রয়োগ করা হয়েছে।
- Dark theme-এর primary action button-এ text/background contrast উন্নত করা হয়েছে এবং মূল README/package manifest বর্তমান release অনুযায়ী আপডেট হয়েছে।
- বিদ্যমান notification, theme toggle, settings navigation, section navigation ও cloud sync accessor অক্ষত রাখা হয়েছে।

### ইনস্টল

1. প্রজেক্ট ফোল্ডারের একটি backup রাখুন।
2. ZIP ফাইলটি খুলে ভেতরের ফাইলগুলো প্রজেক্টের **root folder**-এ extract করুন। Folder structure merge/replace করতে দিন।
3. `.env.local` পরিবর্তন বা মুছে ফেলবেন না।
4. Supabase SQL Editor-এ কোনো SQL চালানোর দরকার নেই।
5. ডিপেন্ডেন্সি পরিবর্তন নেই; `npm install` এই প্যাচের জন্য আবশ্যক নয়।

### পরীক্ষা

এই patch package version alignment, responsive UI contracts, sync compact/accessible label, theme token, navigation action, ও আগের regression contracts পরীক্ষা করে।

- `node --test tests/*.test.mjs`
- `node --experimental-strip-types --test tests/*.test.ts`
- CSS parser validation
- TypeScript/TSX syntax transpile validation

এই build archive তৈরি করার সময় `node_modules` ইনস্টল করা ছিল না। তাই পূর্ণ `npm run typecheck`, `npm run lint`, এবং `npm run build` চালানো হয়েছে বলে দাবি করা হচ্ছে না। ইনস্টল করা প্রজেক্টে এগুলো চালিয়ে চূড়ান্ত deployment যাচাই করুন।

### গুরুত্বপূর্ণ

এই প্যাচে Database schema, RLS, RPC, Supabase data model, authentication, tracker CRUD, relational record IDs, sync pipeline বা `.env.local`-এ পরিবর্তন নেই। UI presentation layer ও package version metadata ছাড়া অন্য কোনো dependency যোগ করা হয়নি।
