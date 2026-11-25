import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "an-login-handoff";
const MAX_AGE_SECONDS = 15;
type HandoffPayload = { sub: string; email: string; exp: number; nonce: string };
function sign(input: string, secret: string) { return createHmac("sha256", secret).update(input).digest("base64url"); }
export function createLoginHandoff(userId: string, email: string, secret: string) {
  const payload: HandoffPayload = { sub: userId, email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS, nonce: randomBytes(16).toString("hex") };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}
export function verifyLoginHandoff(token: string | undefined, secret: string | undefined) {
  if (!token || !secret || secret.length < 32 || token.length > 2048) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = Buffer.from(sign(encoded, secret));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<HandoffPayload>;
    if (typeof payload.sub !== "string" || payload.sub.length < 8 || payload.sub.length > 128) return null;
    if (typeof payload.email !== "string" || payload.email.length > 254 || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.nonce !== "string" || payload.nonce.length < 16) return null;
    return { userId: payload.sub, email: payload.email };
  } catch { return null; }
}
export const LOGIN_HANDOFF_COOKIE = COOKIE_NAME;
export const LOGIN_HANDOFF_MAX_AGE = MAX_AGE_SECONDS;
