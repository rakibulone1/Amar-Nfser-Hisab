import Image from "next/image";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { getLoginEnvironmentStatus } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = getLoginEnvironmentStatus().configured;
  if (configured) {
    const requestHeaders = await headers();
    if (requestHeaders.get("x-verified-user-id")) redirect("/dashboard");
  }
  return <main className="login-minimal-page">
    <div className="login-minimal-card">
      <Image className="login-minimal-logo" src="/brand/logo.svg" alt="Amar Nfser Hisab" width={58} height={58} priority />
      <LoginForm configured={configured}/>
    </div>
  </main>;
}
