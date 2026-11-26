import { Suspense } from "react";
import { HadithLibrary } from "@/modules/hadith/hadith-library";

export const dynamic = "force-dynamic";

export default function HadithPage() {
  return <Suspense fallback={<main className="workspace-loading"><strong>হাদিসের সংগ্রহ প্রস্তুত হচ্ছে…</strong></main>}><HadithLibrary /></Suspense>;
}
