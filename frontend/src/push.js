export function applicationServerKey(value) {
  const source = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(source.padEnd(Math.ceil(source.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function keyBytes(value) {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

export function sameApplicationServerKey(subscription, publicKey) {
  const current = keyBytes(subscription?.options?.applicationServerKey);
  if (!current) return false;
  const expected = applicationServerKey(publicKey);
  if (current.byteLength !== expected.byteLength) return false;
  return current.every((byte, index) => byte === expected[index]);
}

