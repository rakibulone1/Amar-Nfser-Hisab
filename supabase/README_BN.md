# Amar Nfser Hisab — Supabase Setup (Release 1.4.0)

## একটিমাত্র Master SQL

একটি নতুন, খালি Supabase Project তৈরি করে SQL Editor-এ শুধু `MASTER_DATABASE_SETUP.sql` সম্পূর্ণভাবে Run করবে। এতে Schema, Auth Trigger, RLS, RPC এবং Private Storage Bucket তৈরি হবে।

**এই Release-এ numbered migration নেই।** আগের `001/002/003` Migration ও পুরোনো Audit SQL সরানো হয়েছে। নতুন Database-এ একবার Master SQL চালানোই যথেষ্ট।

এটি Fresh Database Setup, Existing Database Migration নয়। SQL-এর Preflight Guard আগে থেকে একই অ্যাপের Schema পেলে Transaction বাতিল করবে। পুরোনো/চলমান Database-এ চালাবে না।

## Frontend Data Contract

Frontend-এর ২৫টি Workspace Collection প্রত্যেকটি নিজস্ব `public.workspace_*` টেবিলে যায়। প্রতিটি পরিবর্তিত Record আলাদা Row হিসেবে সংরক্ষিত হয়; পুরো Workspace-এর JSON Snapshot Table নেই।

- প্রতিটি Collection Table-এ `user_id`, `id`, `record_date`, `record`, `created_at`, `updated_at` আছে।
- `record` JSONB-তে শুধু সেই Table-এর একটি নির্দিষ্ট Record থাকে; পুরো Account-এর Snapshot নয়।
- `workspace_sync_state` শুধু Account Revision Clock।
- `workspace_user_settings`-এ `preferences`, `prayerConfig`, `prayerPreferences` থাকে।
- `profiles` Account Profile এবং `user_preferences` Theme/Server-side Preferences রাখে।

প্রতিটি User-owned Table-এর RLS `auth.uid()` দিয়ে মালিকানা যাচাই করে। Auth User মুছে গেলে সংশ্লিষ্ট relational row FK `ON DELETE CASCADE`-এ মুছে যায়।

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` — server-only; কখনো `NEXT_PUBLIC_` নয়
- `LOGIN_THROTTLE_SECRET` — কমপক্ষে ৩২ অক্ষরের Random Secret

কোনো Secret Key বা `.env.local` GitHub-এ Commit করবে না।

## Auth ও Account Deletion

Owner Account Supabase Dashboard → Authentication → Users থেকে তৈরি করবে। অ্যাপের মধ্যে Public Registration নেই।

Account Delete API Password পুনরায় যাচাই করে, প্রথমে `journal-private` Bucket-এর Account-prefixed Object মুছে, তারপর Auth User Delete করে। সব User-owned relational table-এর FK Cascade Account-এর ডেটা মুছে দেয়। Storage Object FK Cascade-এর অংশ নয়, তাই API সেটি আলাদা করে পরিষ্কার করে।

## Free Plan

কোনো Cron, Edge Function, অতিরিক্ত Extension বা Paid Service প্রয়োজন নেই। শুধু একটি Private `journal-private` Bucket থাকে।

## যাচাই

```powershell
npm ci
npm run test:all
npm run typecheck
npm run lint
npm run build
```

এরপর Vercel Preview Deploy সফল কিনা যাচাই করবে। SQL Run ও Application Build আলাদা ধাপ।
