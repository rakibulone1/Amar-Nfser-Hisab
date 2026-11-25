export type JsonBodyResult =
  | { success: true; data: unknown }
  | { success: false; reason: "too-large" | "invalid-json" };

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return { success: false, reason: "too-large" };
    }
    return { success: true, data: JSON.parse(text) as unknown };
  } catch {
    return { success: false, reason: "invalid-json" };
  }
}
