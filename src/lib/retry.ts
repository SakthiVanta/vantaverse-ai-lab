/**
 * Retries `fn` when it fails with a transient network-level error (a raw
 * `fetch failed`, not an application/SQL error) — the shape Neon's HTTP
 * driver throws on a cold-started compute or a dropped connection, since
 * each query is its own fetch with nothing to transparently reconnect.
 * Anything else is rethrown immediately on the first attempt.
 */
export async function retryOnTransientNetworkError<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 250
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransientNetworkError = err instanceof TypeError && /fetch failed/i.test(err.message);
      if (!isTransientNetworkError || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
