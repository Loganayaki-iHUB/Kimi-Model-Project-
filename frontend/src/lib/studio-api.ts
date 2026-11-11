const BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/studio`;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(240000),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Make sure the backend and MongoDB are running, then retry.",
    );
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      result.error || `Request failed (${response.status}). Please try again.`,
    );
  return result as T;
}
