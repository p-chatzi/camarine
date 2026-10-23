// Web Worker: solves the anti-bot proof of work without freezing the page.
// Finds `nonce` such that SHA-256(salt + nonce) starts with `bits` zero bits (see backend/forum/antibot.py).
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

function leadingZeroBits(digest: Uint8Array): number {
  let bits = 0;
  for (const byte of digest) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

self.onmessage = (event: MessageEvent<{ salt: string; bits: number }>) => {
  const { salt, bits } = event.data;
  for (let nonce = 0; nonce < 1e9; nonce++) {
    if (leadingZeroBits(sha256(utf8ToBytes(salt + nonce))) >= bits) {
      self.postMessage({ nonce: String(nonce) });
      return;
    }
  }
};
