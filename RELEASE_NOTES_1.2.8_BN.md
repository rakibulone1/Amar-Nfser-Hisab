# Amar Nfser Hisab — Release 1.2.8

## উদ্দেশ্য
Release 1.2.7-এর ওপর ব্যবহারযোগ্যতার শেষ ধাপ: সিঙ্কের প্রকৃত সময়, ধারাবাহিক Section Header, লক্ষ্য/Stage Deep Link, পৃথক Record Edit এবং সুনির্দিষ্ট বাংলা Save Feedback।

## মূল উন্নয়ন
- Server-confirmed `updated_at` থেকে Last Sync Timestamp। Browser-এর বর্তমান সময়কে Server Sync Time হিসেবে দেখানো হয় না।
- Redundant footer cloud-save box সরানো।
- Section Header: Left Back + Center Title Chip + Right Action; অতিরিক্ত eyebrow সরানো।
- Dashboard Date Center Alignment এবং পূর্ণ বাংলা তারিখ-রেঞ্জ।
- Goals Tab equal-width; default Self-Purification Journey; progress calculation-এর ব্যাখ্যা।
- Dashboard Journey/Next Goal Card থেকে সঠিক Goal/Stage-এ Deep Link।
- Goal Task-এর পৃথক Create/Edit/Complete/Delete।
- Tracker Item History-তে পৃথক Edit/Delete, যা existing relational record ID বজায় রাখে।
- Hadith Detail Page-এর Editorial Layout।
- Cloud persistence-নির্ভর বাংলা Green/Red Toast।
- Footer ও Mobile Dialog-এ Responsive spacing, safe-area এবং reduced-motion support।

## অপরিবর্তিত
- Supabase Table Schema, RLS, API endpoint shape, Relational Workspace payload model, Prayer/Qada calculation, Maghrib journal day, Journey stage schedule এবং User Data IDs।
- কোনো SQL Migration, Storage Bucket, Environment Variable বা npm Dependency যোগ করা হয়নি।
