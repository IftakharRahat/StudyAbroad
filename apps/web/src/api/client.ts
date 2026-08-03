const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type RequestOptions = RequestInit & {
  token?: string | null;
  cacheTtlMs?: number;
  noCache?: boolean;
};

type CachedResponse = {
  expiresAt: number;
  value: unknown;
};

const defaultGetCacheTtlMs = 20_000;
const responseCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";
  const cacheable = method === "GET" && !options.noCache;
  const cacheKey = `${options.token ?? "public"}:${path}`;
  const now = Date.now();

  if (cacheable) {
    const cached = responseCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const inFlight = inFlightRequests.get(cacheKey);

    if (inFlight) {
      return inFlight as Promise<T>;
    }
  } else if (method !== "GET") {
    clearApiCache();
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const request = fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message ?? "Request failed");
      }

      if (cacheable) {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + (options.cacheTtlMs ?? defaultGetCacheTtlMs),
          value: data
        });
      }

      return data as T;
    })
    .finally(() => {
      if (cacheable) {
        inFlightRequests.delete(cacheKey);
      }
    });

  if (cacheable) {
    inFlightRequests.set(cacheKey, request);
  }

  return request;
}

export function clearApiCache() {
  responseCache.clear();
}
