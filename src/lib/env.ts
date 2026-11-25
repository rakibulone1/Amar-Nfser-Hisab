function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return !normalized || ["replace_me", "replace-with", "your-project", "your_project", "paste_", "example_"].some((marker) => normalized.includes(marker));
}

function isSupportedPublishableKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
}

export type PublicEnvironmentStatus = {
  configured: boolean;
  missing: string[];
  url: string | null;
  publishableKey: string | null;
};

export function getPublicEnvironmentStatus(): PublicEnvironmentStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const keyCandidates = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ].map((value) => value?.trim() || "");
  const publishableKey = keyCandidates.find((value) => !isPlaceholder(value) && isSupportedPublishableKey(value)) || "";
  const missing: string[] = [];

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  } else if (isPlaceholder(url)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL (আসল Project URL বসাতে হবে)");
  } else {
    try {
      const parsed = new URL(url);
      const validProtocol = parsed.protocol === "https:" ||
        (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname));
      if (!validProtocol || parsed.username || parsed.password) {
        missing.push("NEXT_PUBLIC_SUPABASE_URL (সঠিক HTTPS Project URL নয়)");
      }
    } catch {
      missing.push("NEXT_PUBLIC_SUPABASE_URL (URL সঠিক নয়)");
    }
  }

  if (!publishableKey) {
    const hasNonPlaceholderKey = keyCandidates.some((value) => !isPlaceholder(value));
    missing.push(hasNonPlaceholderKey
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_ অথবা legacy JWT anon key হতে হবে)"
      : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (অথবা legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return {
    configured: missing.length === 0,
    missing,
    url: url && !isPlaceholder(url) ? url : null,
    publishableKey: publishableKey && !isPlaceholder(publishableKey) ? publishableKey : null
  };
}

export const hasSupabaseEnvironment = getPublicEnvironmentStatus().configured;

export function getSupabaseEnvironment() {
  const status = getPublicEnvironmentStatus();
  if (!status.configured || !status.url || !status.publishableKey) {
    throw new Error(`Supabase Public Environment অসম্পূর্ণ: ${status.missing.join(", ")}`);
  }
  return { url: status.url, publishableKey: status.publishableKey };
}
