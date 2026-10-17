// Platform BE adddress baked into the CLI (npm).
// Juri tidak perlu mengisi BE URL saat init — init hanya menanyakan
// baseUrl Express miliknya sendiri. Override untuk development lokal:
// SONIC_POINT_PLATFORM_URL=https://xxx.vercel.app (atau http://localhost:3000).

export const DEFAULT_PLATFORM_URL = "https://sonicpoint.vercel.app";

export function resolvePlatformUrl(): string {
  const override = process.env.SONIC_POINT_PLATFORM_URL?.trim().replace(/\/+$/, "");
  if (override) return override;
  return DEFAULT_PLATFORM_URL;
}
