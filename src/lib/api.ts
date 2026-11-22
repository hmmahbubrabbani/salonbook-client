function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/api/v1')
    ? endpoint
    : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (!base) {
    return cleanEndpoint;
  }

  // যদি NEXT_PUBLIC_API_URL-এর শেষে ইতিমধ্যে /api/v1 থাকে, তবে ডাবল /api/v1 এড়ান
  if (base.endsWith('/api/v1')) {
    const withoutPrefix = cleanEndpoint.replace(/^\/api\/v1/, '');
    return `${base}${withoutPrefix || '/'}`;
  }

  return `${base}${cleanEndpoint}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const url = buildApiUrl(endpoint);

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed with status ${res.status}`);
  }

  return payload as T;
}