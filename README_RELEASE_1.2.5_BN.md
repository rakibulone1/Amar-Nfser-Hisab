# Amar Nfser Hisab — Release 1.2.5 (A+ Account-Owned Online)

## মূল লক্ষ্য

Release 1.2.4-এর UI Baseline ও আগের Tracker/Prayer/Journey Feature অক্ষত রেখে Legacy Snapshot ও Browser Persistence অপসারণ, Account-owned data lifecycle এবং Account Delete Flow শক্ত করা।

## স্থায়ী ডেটা কোথায় থাকে

- Tracker-এর প্রতিটি collection পৃথক `workspace_*` table-এ থাকে।
- Theme ও account preference `workspace_user_settings`-এ থাকে।
- `workspace_sync_state` কেবল account revision clock রাখে; payload নয়।
- Runtime-এ `user_workspace_snapshots` আর পড়া/লেখা হয় না। নতুন Master SQL-এ এই table তৈরি হয় না।
- IndexedDB/Local Storage-এ নতুন durable data লেখা বা পুরোনো data পড়া হয় না। পুরোনো release-এর নির্দিষ্ট key/database cleanup-only পদ্ধতিতে সরানো হয়।
- Hadith JSON অ্যাপের static asset; এটি account data নয়।

## Migration নির্দেশনা

### নতুন/খালি Supabase Project

শুধু `supabase/MASTER_DATABASE_SETUP.sql` একবার চালাও। এই Master SQL-এ Relational Workspace, RLS, SECURITY INVOKER RPC, private attachment bucket/policy ও account cascade schema রয়েছে। 001/002/003 আলাদা চালাবে না।

### আগের Release 1.1/1.2 Database

1. Supabase Dashboard থেকে Backup নাও।
2. `002_relational_workspace.sql` আগে সফলভাবে চালানো না থাকলে সেটি একবার চালাও। এটি legacy snapshot-এর data `workspace_*` tables-এ কপি করে; archive তখনও থাকে।
3. `WORKSPACE_DATA_AUDIT_RELATIONAL.sql` চালিয়ে snapshot থেকে আসা গুরুত্বপূর্ণ record count এবং নতুন relational count মিলিয়ে নাও।
4. সব active data ঠিক আছে নিশ্চিত হলে `003_remove_legacy_snapshot.sql` একবার চালাও। এটি `save_user_workspace_snapshot` RPC ও `user_workspace_snapshots` table drop করে। Relational `workspace_*` data মুছে না।
5. 003 Migration-এর আগে `002` সফল না হলে Migration 003 ইচ্ছাকৃতভাবে error দিয়ে থামবে। Preflight error এলে force-drop করবে না।

Migration 003-এর Table Drop অপরিবর্তনীয়; পুরোনো Snapshot Archive ইচ্ছাকৃতভাবে হারাবে। User চাইলেও active Relational tables truncate/drop করা হয় না।

## Account Delete

Settings-এর Account Delete প্যানেলে বর্তমান পাসওয়ার্ড দিয়ে re-authentication এবং `DELETE` টাইপ করা বাধ্যতামূলক। Server প্রথমে `journal-private` bucket-এর ওই Account ID-র prefix-এর সব private object সরায়; তারপর Supabase Auth User delete করে। `auth.users`-এ `ON DELETE CASCADE` থাকার কারণে Account-linked public relational rows সরবে। Storage cleanup ব্যর্থ হলে Auth account delete করা হবে না।

Supabase Auth Dashboard থেকে সরাসরি user delete করলে app-এর Storage cleanup endpoint চলবে না; account delete করার জন্য অ্যাপের Settings flow ব্যবহার করো।

## পরীক্ষা ও সীমাবদ্ধতা

- 101টি Node `.mjs` regression/contract test পাস করেছে।
- `tsx` unavailable থাকায় `.ts`-ভিত্তিক runtime tests, full TypeScript typecheck, ESLint ও Next.js production build এই প্যাকেজিং পরিবেশে চালানো হয়নি।
- Live Supabase Migration এবং বাস্তব Account Delete পরীক্ষা করা হয়নি। Production-এ প্রয়োগের আগে Supabase Backup ও migration preflight আবশ্যক।
