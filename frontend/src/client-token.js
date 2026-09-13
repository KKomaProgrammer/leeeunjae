// getRandomValues is also available while a custom domain is waiting for HTTPS.
// Keep the existing 64-character token format and cryptographic randomness.
export function createClientToken(cryptoApi = globalThis.crypto) {
  return Array.from(cryptoApi.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0')).join('');
}
