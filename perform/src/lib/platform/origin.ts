function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export function getServerBaseUrl(): string {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL)
    || normalizeBaseUrl(process.env.VERCEL_URL)
    || 'http://localhost:3000'
  );
}
