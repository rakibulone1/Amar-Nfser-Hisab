# Amar Nfser Hisab — Release 1.2.7

## Release লক্ষ্য

Release 1.2.5 + Fix Patch 01 থেকে Release 1.2.6-এর সংশোধনসমূহ একীভূত করে সামগ্রিক ব্যবহার-অভিজ্ঞতা আরও পরিণত, ভারসাম্যপূর্ণ এবং মোবাইল-প্রথম করা হয়েছে। এই আপডেটে কোনো Tracker Logic, Maghrib-based Date Logic, Supabase API Contract, RLS Policy বা Durable Data Format পরিবর্তন করা হয়নি।

## UI/UX উন্নয়ন

- Dashboard-এর Gregorian/Hijri Date Card এখন কেন্দ্রে, বাংলা টাইপোগ্রাফি ও সংক্ষিপ্ত Pill Surface-সহ।
- Section Header-এ কমপ্যাক্ট Back Control, Eyebrow ও Heading-এর একই Hierarchy; Stage Detail Header-ও একই Grid Rhythm ব্যবহার করে।
- Desktop Topbar-এর Brand, Current Section ও Actions ভারসাম্যপূর্ণ; Primary Tabs কেন্দ্রে এবং নির্বাচিত Tab স্পষ্ট।
- Main Content Desktop-এ সীমিত প্রস্থের কেন্দ্রীভূত Canvas, যাতে অতিরিক্ত চওড়া স্ক্রিনেও লেখা ছড়িয়ে না যায়।
- Mobile Bottom Navigation এখন Safe-area-aware Floating Dock; বড় Touch Target এবং আলাদা Active State রয়েছে।
- Metric Cards, Journey Cards, Stage List, Hadith Card/Reader, Tracker Panels, Forms ও Buttons-এর Border, Radius, Padding, Type Scale ও Interaction আরও সামঞ্জস্যপূর্ণ।
- Light ও Dark Theme-এর Surface, Border, Text Contrast এবং Card Accent নতুন করে ভারসাম্য করা হয়েছে।
- Keyboard Focus Ring, Disabled State এবং Reduced-motion Preference বজায় রেখে Interaction উন্নত করা হয়েছে।

## Data ও Compatibility

- Supabase Relational Workspace, Account Ownership, RLS এবং Account Delete Cascade অপরিবর্তিত।
- কোনো SQL Migration নেই।
- কোনো নতুন Table, RPC, Storage Bucket, Edge Function, Cron বা Environment Variable নেই।
- কোনো নতুন npm Dependency নেই।
- Existing User Data Format অপরিবর্তিত।

## প্রয়োগ

এই Cumulative Patch Release 1.2.5 A+ Account-Owned Online + Fix Patch 01-এর ওপর বসাবে। এতে Release 1.2.6-এর মধ্যবর্তী পরিবর্তন অন্তর্ভুক্ত আছে, তাই 1.2.6 Patch আলাদা করে বসানোর দরকার নেই। `package.json`-সহ বর্তমান Root-এ ZIP Extract করে Replace করবে। `.env.local` এবং `.git` অক্ষত রাখবে। Release 1.2.5-এ Fix 01/Release 1.2.6 সম্পূর্ণভাবে প্রয়োগ না থাকলে প্রথমে সেই সংস্করণে আপডেট করবে।

## যাচাই

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

Node.js 22.x ব্যবহার করার পরামর্শ দেওয়া হচ্ছে। Production deploy-এর আগে Type Check, Lint ও Build সফল হওয়া নিশ্চিত করবে।

## প্যাকেজিং পরিবেশে যাচাই

- JavaScript Contract/Regression Tests: ১২৬/১২৬ PASS।
- TypeScript Runtime Tests: ১৮/১৮ PASS (Node.js Type Stripping দিয়ে)।
- ৭২টি TS/TSX Source Parse: কোনো Syntax Diagnostic নেই।
- CSS PostCSS Parse: PASS।
- Clean Patch Apply এবং দুই ZIP-এর Integrity: PASS।
- `tsc --noEmit`, ESLint এবং Next.js Production Build এখানে সম্পন্ন হয়নি, কারণ পূর্ণ `node_modules` ইনস্টল করা ছিল না। Windows Project-এ `npm ci`-এর পর এগুলো চালাতে হবে।
