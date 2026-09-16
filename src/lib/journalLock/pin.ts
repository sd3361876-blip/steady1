/**
 * PIN verification material.
 *
 * The PIN itself is never stored anywhere — not on the device, not in Supabase.
 * Setup derives a PBKDF2-SHA256 verifier from the PIN plus a random per-device
 * salt; only that verifier lives in device secure storage, and unlocking
 * re-derives it to compare.
 */
export type PinRecord = {
  v: 1;
  salt: string;
  iterations: number;
  hash: string;
};

const ITERATIONS = 210_000;

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error("This device cannot securely protect a PIN (no Web Crypto).");
  }
  return c.subtle;
}

export const pinCryptoAvailable = (): boolean => Boolean(globalThis.crypto?.subtle);

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out);
}

function fromBase64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const crypto = subtle();
  const key = await crypto.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin);

export async function createPinRecord(pin: string): Promise<PinRecord> {
  if (!isValidPin(pin)) throw new Error("A Journal PIN must be exactly 4 digits.");
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  return {
    v: 1,
    salt: toBase64(salt),
    iterations: ITERATIONS,
    hash: await derive(pin, salt, ITERATIONS),
  };
}

export async function verifyPin(pin: string, record: PinRecord | null): Promise<boolean> {
  if (!record || !isValidPin(pin)) return false;
  try {
    const hash = await derive(pin, fromBase64(record.salt), record.iterations);
    // Constant-time-ish comparison.
    if (hash.length !== record.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i += 1) diff |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
    return diff === 0;
  } catch (error) {
    console.warn("[journal-lock] verify failed", error);
    return false;
  }
}
