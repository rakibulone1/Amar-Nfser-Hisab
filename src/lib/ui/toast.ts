export type AppToastType = "success" | "error" | "info";
export type AppToastMessage = { type: AppToastType; message: string; id: string };
const EVENT_NAME = "amar-nfser-hisab:toast";

export function showAppToast(type: AppToastType, message: string) {
  if (typeof window === "undefined" || !message.trim()) return;
  const detail: AppToastMessage = {
    type,
    message: message.trim().slice(0, 220),
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  };
  window.dispatchEvent(new CustomEvent<AppToastMessage>(EVENT_NAME, { detail }));
}

export function subscribeAppToast(listener: (message: AppToastMessage) => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<AppToastMessage>).detail;
    if (detail && (detail.type === "success" || detail.type === "error" || detail.type === "info") && typeof detail.message === "string") listener(detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
