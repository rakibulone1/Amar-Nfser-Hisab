type FetchJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

const inFlightGets = new Map<string, Promise<FetchJsonResult<unknown>>>();

/**
 * Deduplicates identical GET requests while they are in flight. This prevents
 * React Strict Mode's development re-mount from firing duplicate read queries.
 * Settled responses are never cached; each later navigation reads fresh data.
 */
export function fetchJsonOnce<T>(url: string): Promise<FetchJsonResult<T>> {
  const existing = inFlightGets.get(url);
  if (existing) return existing as Promise<FetchJsonResult<T>>;

  const request = fetch(url, { method: "GET", cache: "no-store" })
    .then(async (response) => ({
      ok: response.ok,
      status: response.status,
      data: await response.json() as T
    }));

  inFlightGets.set(url, request);
  const clear = () => {
    if (inFlightGets.get(url) === request) inFlightGets.delete(url);
  };
  void request.then(clear, clear);
  return request;
}
