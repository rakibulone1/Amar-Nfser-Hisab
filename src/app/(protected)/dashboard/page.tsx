import { FrontendWorkspace } from "@/components/frontend-workspace";
import { requireUser } from "@/lib/auth/require-user";
import type { AppSection } from "@/lib/local/store";

export const dynamic = "force-dynamic";

const SECTIONS: AppSection[] = ["home", "goals", "journal", "mirror", "notifications", "settings"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const [identity, params] = await Promise.all([requireUser(), searchParams]);
  const initialSection = SECTIONS.includes(params.section as AppSection) ? params.section as AppSection : "home";
  return <FrontendWorkspace userEmail={identity.userEmail} initialSection={initialSection} />;
}
