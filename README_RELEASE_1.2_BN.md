# Amar Nfser Hisab — Release 1.2.2

## এই প্যাচে
- ২৩ নভেম্বর ২০২৬ থেকে ৩০ অক্টোবর ২০৩০ পর্যন্ত ৭১টি স্থির পর্যায়; মোট ১,৪৩৮ দিন। তিনটি মডিউল: ৩৩ + ৫ + ৩৩ পর্যায়; ৩ থেকে ৩৮ দিন পর্যন্ত বাড়ে, পরে ৩ দিনে নামে।
- আত্মশুদ্ধির পর্যায়ভিত্তিক অনুভূতি/অভিজ্ঞতা, সম্পাদনা, মুছে ফেলা এবং সম্পন্ন পর্যায়ের পুরস্কার।
- আলাদা লক্ষ্য ট্যাব; সময়সীমা পরস্পরের সঙ্গে Overlap করতে পারবে না; প্রতিটি লক্ষ্যতে কাজের তালিকা।
- Dashboard-এ বাংলা হিজরি মাসের নাম, চারটি দৈনিক কাজের কার্ড এবং স্থানীয় JSON থেকে ২০টি সহিহ হাদিস।
- হাদিসের ডেটা `src/data/hadith-bn.json`-এ; নতুন হাদিস যোগ করতে একই ৮টি ফিল্ড রাখতে হবে। উৎস-মানচিত্র `src/data/HADITH_SOURCES_BN.md`-এ। বাংলা লেখা প্রকল্পের নিজস্ব অর্থানুবাদ; প্রকাশের আগে প্রয়োজনে আলেম/সম্পাদক দিয়ে পর্যালোচনা করো।
- ওয়াক্তের নিষিদ্ধ সময়ের আনুমানিক উইন্ডো; ইশার শেষ সময় পরদিন ফজরের এক মিনিট আগে।
- প্রতিটি Tracker-এর জন্য সরাসরি Entry deep-link, কাজা নিশ্চিতকরণসহ নোটিফিকেশন পপওভার, প্রতিটি প্রধান সেকশনে Dashboard-এ ফেরার বোতাম এবং দুই-লাইনের ব্যক্তিগত ফুটার।
- Dashboard-এ ইংরেজি গ্রেগরিয়ান তারিখের পাশে বাংলা হিজরি মাসের নাম; লক্ষ্য-কার্ড থেকে সংশ্লিষ্ট পর্যায়ে সরাসরি যাওয়া যায়।
- একই তারিখে ভিন্ন অবস্থানের Prayer Times Cache আলাদা রেকর্ড-আইডি পায়; একই ব্যবহারকারীর একাধিক লক্ষ্য একসঙ্গে জমা হলেও Database Trigger overlap যাচাই serialize করে।
- Runtime Snapshot read/write সরানো হয়েছে; প্রতিটি রেকর্ড নিজস্ব `workspace_*` টেবিলে সংরক্ষিত হয়। Read একবার relational RPC; Save শুধু পরিবর্তিত রেকর্ডের delta পাঠায়।

## গুরুত্বপূর্ণ Database নির্দেশনা

### বিদ্যমান Release 1.1 Database
1. Supabase-এর বর্তমান ডেটাবেসের Backup নাও।
2. `supabase/migrations/002_relational_workspace.sql` সম্পূর্ণ একবার চালাও।
3. এটি পুরোনো `user_workspace_snapshots` থেকে প্রতিটি collection-এর রেকর্ড আলাদা `workspace_*` টেবিলে কপি করে। পুরোনো Snapshot মুছে দেয় না; তা rollback/verification archive হিসেবে থাকে।
4. Dashboard থেকে Refresh করে সালাত, কুরআন, জিকির, লক্ষ্য এবং পুরোনো রেকর্ডের সংখ্যা যাচাই করো।
5. `supabase/WORKSPACE_DATA_AUDIT_RELATIONAL.sql`-এ নিজের Login Email বসিয়ে নতুন টেবিলগুলোর row count দেখো।

### নতুন/খালি Supabase Project
- `supabase/MASTER_DATABASE_SETUP.sql` একবার চালাও। এই Master SQL-এ Release 1.2 relational schema ও RPC একীভূত আছে; আলাদা করে 001 বা 002 চালাবে না।

**সতর্কতা:** বিদ্যমান Database-এ পুরো Master SQL পুনরায় চালাবে না। Existing Database-এর জন্য শুধু 002 Migration। Migration সফল না হওয়া পর্যন্ত নতুন Release-এ রেকর্ড যোগ করবে না।

## Supabase সংরক্ষণ কাঠামো
- `workspace_prayer_entries`, `workspace_qada_entries`, `workspace_quran_entries`, `workspace_dhikr_sessions`, `workspace_fasting_entries`, `workspace_deed_entries`, `workspace_avoid_entries`, `workspace_study_entries`, `workspace_habit_*`, `workspace_reflections`, `workspace_journey_*`, `workspace_deadline_*` এবং অন্যান্য collection-এর জন্য আলাদা টেবিল।
- প্রতিটি টেবিলে মালিক-আইডি, রেকর্ড আইডি, তারিখ এবং একটি JSONB `record` থাকে; পুরো Workspace Snapshot আর runtime-এ লেখা হয় না।
- `workspace_sync_state` কেবল per-user revision clock; `workspace_user_settings`-এ settings রাখা হয়।
- RLS প্রতিটি রেকর্ডে `auth.uid()`-এর মালিকানা যাচাই করে। RPC `SECURITY INVOKER`; public/anon execution বন্ধ। Save-এ revision check ও transaction advisory lock থাকে।
- Goal start/end date-এর overlap database trigger-এও আটকানো হয়।
- কোনো নতুন Storage Bucket, Cron, Edge Function বা paid service নেই।

## হাদিস ডেটা
`src/data/hadith-bn.json`-এর মূল কাঠামো:
- `categories`: `{ id, name }`
- `hadiths`: `id`, `category_id`, `summary`, `full_text_bn`, `narrator`, `book`, `hadith_number`, `chapter`

এটি build-time static asset; কোনো Supabase query বা আলাদা API call নেই। Dashboard-এ অ্যাপ নতুন করে খুললে একটি র্যান্ডম হাদিস দেখায়; “অন্য হাদিস” দিয়ে বদলানো যায়। উৎস-মানচিত্রে ২০টি reference রাখা হয়েছে; অনুবাদগুলো নতুন করে লেখা বাংলা অর্থানুবাদ।

## পরীক্ষা
```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

Node.js 22.x ব্যবহার করো (`.nvmrc` ও `package.json` engines)। Windows `EBUSY` হলে চলমান Node/Next প্রক্রিয়া বন্ধ করে নতুন Terminal খুলে `npm ci` চালাও।
