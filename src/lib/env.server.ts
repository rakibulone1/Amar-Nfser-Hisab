import "server-only";
import { getPublicEnvironmentStatus } from "@/lib/env";

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return !normalized || ["replace_me", "replace-with", "paste_", "example_"].some((marker) => normalized.includes(marker));
}

function isSupportedServerKey(value: string) {
  return value.startsWith("sb_secret_") || value.startsWith("eyJ");
}

export type LoginEnvironmentStatus = {
  configured: boolean;
  missing: string[];
};

/** Returns variable names only. Secret values are never returned to UI or logs. */
export function getLoginEnvironmentStatus(): LoginEnvironmentStatus {
  const publicStatus = getPublicEnvironmentStatus();
  const missing = [...publicStatus.missing];
  const secretCandidates = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .map((value) => value?.trim() || "");
  const supabaseSecret = secretCandidates.find((value) => !isPlaceholder(value) && isSupportedServerKey(value));
  const throttleSecret = process.env.LOGIN_THROTTLE_SECRET;

  if (!supabaseSecret) {
    const hasNonPlaceholderKey = secretCandidates.some((value) => !isPlaceholder(value));
    missing.push(hasNonPlaceholderKey
      ? "SUPABASE_SECRET_KEY (sb_secret_ অথবা legacy JWT service_role key হতে হবে)"
      : "SUPABASE_SECRET_KEY (অথবা legacy SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (isPlaceholder(throttleSecret) || (throttleSecret?.trim().length ?? 0) < 32) {
    missing.push("LOGIN_THROTTLE_SECRET (কমপক্ষে ৩২ অক্ষরের random secret)");
  }

  return { configured: missing.length === 0, missing };
}

export function getLoginThrottleSecret() {
  const secret = process.env.LOGIN_THROTTLE_SECRET?.trim();
  if (!secret || secret.length < 32 || isPlaceholder(secret)) {
    throw new Error("LOGIN_THROTTLE_SECRET must contain at least 32 non-placeholder characters.");
  }
  return secret;
}

export function getSupabaseSecretKey() {
  const secretKey = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .map((value) => value?.trim() || "").find((value) => !isPlaceholder(value) && isSupportedServerKey(value));
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required for server-side login throttling.");
  }
  return secretKey;
}
