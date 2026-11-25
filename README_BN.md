# Amar Nfser Hisab

ব্যক্তিগত সালাত, আত্মশুদ্ধি, কুরআন, জিকির, সিয়াম, মুহাসাবা ও ব্যক্তিগত পরিকল্পনার ওয়েব অ্যাপ। অ্যাপের ব্র্যান্ড নাম ইংরেজিতে; ব্যবহারকারীর ইন্টারফেস বাংলায়। দিন গণনা বাংলাদেশের সময়ে মাগরিব থেকে শুরু হয়।

## ১. প্রয়োজনীয়তা

- Node.js 22 LTS বা Next.js 16 সমর্থিত নতুন Node.js সংস্করণ
- Supabase Project
- Windows PowerShell / macOS Terminal / Linux Shell

## ২. Environment প্রস্তুত

প্রজেক্ট Root-এ চালাও:

```bash
npm install
npm run setup:env
```

তারপর `.env.local` ফাইলে নিজের Supabase-এর URL, Publishable Key এবং Server-only Secret Key বসাও। `LOGIN_THROTTLE_SECRET` স্বয়ংক্রিয়ভাবে তৈরি হয়; সেটি অন্য কাউকে দেবে না।

Environment পরীক্ষা:

```bash
npm run env:check
```

## ৩. Supabase Database প্রস্তুত

একটি নতুন বা খালি Supabase Project-এর SQL Editor খোলো। এই একটিমাত্র Master SQL সম্পূর্ণভাবে কপি করে Run করো:

`supabase/MASTER_DATABASE_SETUP.sql`

এটি প্রজেক্টের পূর্ণাঙ্গ Master Schema: প্রয়োজনীয় Tracker টেবিল, owner-scoped Row Level Security, private attachment storage policy, backup/restore RPC এবং ব্যক্তিগত online workspace snapshot table। এই প্যাকেজে আলাদা incremental migration নেই।

**সতর্কতা:** এটি নতুন/খালি Database-এর জন্য। আগে থেকে ব্যবহার করা Database-এ অন্ধভাবে চালাবে না; বিদ্যমান তথ্য ও schema আগে যাচাই করতে হবে। SQL Editor-এ Run সফল না হওয়া পর্যন্ত Cloud Sync সম্পন্ন হবে না।

## ৪. পরীক্ষা ও চালু করা

```bash
npm run test:all
npm run typecheck
npm run lint
npm run build
npm run dev
```

তারপর ব্রাউজারে `http://localhost:3000` খোলো। Production-এ চালাতে `npm run build` সফল হওয়ার পর `npm run start` ব্যবহার করো।

## ৫. তথ্য সংরক্ষণ — অনলাইন-নির্ভর

- স্থায়ী Workspace তথ্য authenticated API-এর মাধ্যমে Supabase-এর `user_workspace_snapshots` টেবিলে সংরক্ষিত হয়; অ্যাপ নতুন করে IndexedDB বা Local Storage-এ Journal/Tracker ডেটা লেখে না।
- থিমসহ ব্যবহারকারীর পছন্দ `user_preferences` টেবিলে সংরক্ষিত হয়।
- আগের সংস্করণের IndexedDB/Local Storage-এ থাকা রেকর্ড কেবল একবার পড়ে Cloud-এ স্থানান্তরের চেষ্টা করা হয়। Cloud Save সফল না হওয়া পর্যন্ত পুরোনো কপি মোছা হয় না; সফল হলে পুরোনো ব্রাউজার কপি পরিষ্কার করা হয়।
- ইন্টারনেট না থাকলে নতুন পরিবর্তন স্থায়ীভাবে সংরক্ষিত হবে না। সংরক্ষণ ব্যর্থ হলে Status জানাবে; Refresh করলে অসম্প্রেরিত পরিবর্তন হারাতে পারে।
- একক Workspace Snapshot-এর বর্তমান সীমা ৫ MB। বড় সংযুক্তি আলাদা Storage ব্যবস্থায় রাখতে হবে।
- Hadith Card-এর দশটি প্রাথমিক রেফারেন্স `src/data/hadith-bn.json` থেকে আসে; Database query লাগে না।

## ৬. সালাতের দিন ও সময়

- সময় অঞ্চল: `Asia/Dhaka`
- ওয়াক্তের হিসাব: Karachi Calculation Method এবং Hanafi Asr Method
- মাগরিবের সময়ে নতুন হিসাবের দিন শুরু; ক্রম: মাগরিব → ইশা → ফজর → যোহর → আসর
- মসজিদের জামাতের সময় Settings থেকে হাতে দিতে হবে; সেটি ওয়াক্তের শুরু/শেষের হিসাব থেকে আলাদা
- API সময়সূচি না পেলে পূর্বে Cache করা সময় ব্যবহার হয়; প্রথমবার Offline থাকলে মাগরিবের সময় না পাওয়া পর্যন্ত দিন-পরিবর্তন নির্ধারণে সীমাবদ্ধতা থাকবে

## ৭. নিরাপত্তা

`.env.local`, Supabase Secret Key, session cookie বা ব্যক্তিগত Backup কখনো ZIP, Git Repository বা কারও সঙ্গে শেয়ার করবে না। এই পূর্ণ Project ZIP-এ কোনো ব্যক্তিগত Environment Secret অন্তর্ভুক্ত নেই।


## ৮. Vercel-এ প্রথম Production Release

এই প্রজেক্টটি Next.js App Router ব্যবহার করে। Vercel-এ নতুন Project তৈরি বা Git Repository Import করার সময় Framework Preset `Next.js` এবং Root Directory প্রজেক্টের Root-এ রাখো। Vercel Next.js নিজে শনাক্ত করে; আলাদা `vercel.json`, Output Directory override বা Supabase Cron/Edge Function দরকার নেই। `package-lock.json` থাকায় npm নির্ধারিত হবে। Node.js Version `22.x` ব্যবহার করো।

### GitHub-এ প্রথম Push

Git Repository আগে তৈরি করে তার HTTPS URL নাও। PowerShell-এ Project Root-এ:

```powershell
 git init
 git branch -M main
 git add .
 git commit -m "Release 1: polished Bengali interface"
 git remote add origin https://github.com/USERNAME/REPOSITORY.git
 git push -u origin main
```

Repository আগে থেকেই যুক্ত থাকলে `git init` বা `git remote add` আবার চালিও না। শুধু:

```powershell
 git status
 git add .
 git commit -m "Release 1: final UI and deployment setup"
 git push origin main
```

`USERNAME/REPOSITORY` নিজের GitHub তথ্য দিয়ে বদলাবে। `git remote -v` দিয়ে সংযোগ যাচাই করতে পারো। `.env.local`, Supabase Secret Key, `.vercel/`, `node_modules/` এবং `.next/` Git-এ যোগ করা যাবে না—`.gitignore` এগুলো বাদ রাখে।

### Vercel Project সংযোগ

1. Vercel Dashboard থেকে `Add New → Project` বেছে Git Provider-এ থাকা Repository Import করো।
2. Framework Preset `Next.js`, Root Directory প্রজেক্টের Root এবং Node.js `22.x` নিশ্চিত করো।
3. Build Command `npm run build` রাখো। Output Directory ফাঁকা/Default রাখো; Next.js-এর জন্য `.next` নিজে Vercel সামলায়। Install Command-ও Default রাখো।
4. Environment Variables-এ নিচের চারটি মান Production ও Preview—দুই Environment-এই যোগ করো।
5. প্রথম Deploy-এর পর Preview URL পরীক্ষা করে সব ঠিক থাকলে Production Branch `main`-এ Push করো বা Production Deployment চালাও। Git Repository সংযুক্ত থাকলে `main`-এ নতুন Push সাধারণত Production Deployment তৈরি করে; অন্য Branch/PR Preview Deployment তৈরি করে।

### Vercel Environment Variables

| Name | Value | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | Public config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase-এর `sb_publishable_...` Key | Public config |
| `SUPABASE_SECRET_KEY` | Supabase-এর `sb_secret_...` Server Key | Secret; কখনো `NEXT_PUBLIC_` নয় |
| `LOGIN_THROTTLE_SECRET` | কমপক্ষে ৩২ অক্ষরের random value | Secret |

`YOUR_PROJECT_REF` ও Key নিজের Supabase Project থেকে নেবে। Supabase-এর নতুন Publishable/Secret Key ব্যবহার করো; পুরোনো Project হলে legacy `anon` ও `service_role` JWT alias কোডে সমর্থিত। `SUPABASE_SECRET_KEY` শুধু Server-side Login Throttle RPC-তে ব্যবহৃত হয়। এটিকে Client Bundle, Git বা Screenshot-এ প্রকাশ করবে না।

`LOGIN_THROTTLE_SECRET` তৈরির জন্য PowerShell-এ Node.js চালিয়ে:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

প্রিন্ট হওয়া মানটি Vercel-এর `LOGIN_THROTTLE_SECRET`-এ বসাও। এটি `.env.example`-এ লিখবে না এবং কারও সঙ্গে শেয়ার করবে না। Local `.env.local`-এর জন্য `npm run setup:env` নিজের random মান তৈরি করে; Vercel-এর মান আলাদাভাবে সেট করতে হবে।

এই সোর্সে `NEXT_PUBLIC_DEFAULT_TIME_ZONE` বা `NEXT_PUBLIC_MANUAL_MAGHRIB_TIME` পড়া হয় না; তাই Vercel-এ সেগুলো যোগ করার প্রয়োজন নেই। মাগরিব ও অন্যান্য ব্যক্তিগত পছন্দ অ্যাপের Settings/API দিয়ে Supabase-এ সংরক্ষিত হয়।

### Deploy-এর আগে ও পরে পরীক্ষা

```powershell
npm ci
npm run verify:release
```

সব পরীক্ষা সফল হলে Git Push করো। Vercel Deploy শেষ হলে Login, Dashboard, সালাত/কুরআন/জিকির Entry, Goals, Settings, Theme Save এবং একাধিক Browser Session পরীক্ষা করো। Vercel-এর `Deployments → Build Logs` এবং `Functions → Logs`-এ Runtime Error দেখো।

**ফ্রি প্ল্যান ও খরচ নিয়ন্ত্রণ:** এই Release-এ কোনো Cron, Edge Function, নতুন Storage Bucket বা অপ্রয়োজনীয় API Polling যোগ করা হয়নি। Vercel-এর স্বয়ংক্রিয় Build/Preview ব্যবহার করো; Supabase-এর বিদ্যমান Project ও Master SQL-ই থাকবে। Supabase-এর Usage Dashboard-এ Database, Egress ও Storage খেয়াল রাখবে।

**সতর্কতা:** Secret Key কখনো GitHub বা `NEXT_PUBLIC_` Variable-এ দেবে না। কোনো Key আগে প্রকাশিত হয়ে থাকলে Supabase Dashboard থেকে Rotate করে Vercel-এর Production/Preview Variable-ও আপডেট করে নতুন Deploy করো।
