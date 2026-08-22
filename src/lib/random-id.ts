/**
 * `crypto.randomUUID()` only works in a secure context (HTTPS, or
 * localhost) — browsers disable the whole Web Crypto API otherwise.
 * On a fresh deployment reached over plain HTTP (no SSL configured on
 * the reverse proxy yet, or hitting the host's LAN IP directly), it's
 * `undefined`, and calling it throws "crypto.randomUUID is not a
 * function" — which is exactly what broke every Deal/Start button in
 * production (each dealt card, seat, and telemetry session id was
 * generated with a direct `crypto.randomUUID()` call). See
 * MISTAKES.md.
 *
 * None of these ids are security-sensitive (React keys, seat ids,
 * telemetry session correlation ids) — they just need to be unique
 * enough in practice, so a Math.random() fallback is fine when the
 * real API isn't available.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
