// Discreet anti-bot: fetch a signed challenge and solve it in a Web Worker while the visitor types.
// Nothing to click, no captcha. Starts as soon as a sign-up / reset form is shown.
import { api, type PowChallenge } from './api';

export type SolvedPow = PowChallenge & { nonce: string };

export function startProofOfWork(purpose: 'signup' | 'reset'): Promise<SolvedPow> {
  return api<PowChallenge>(`/auth/pow?purpose=${purpose}`).then(
    (challenge) =>
      new Promise<SolvedPow>((resolve, reject) => {
        const worker = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ nonce: string }>) => {
          worker.terminate();
          resolve({ ...challenge, nonce: event.data.nonce });
        };
        worker.onerror = (err) => {
          worker.terminate();
          reject(err);
        };
        worker.postMessage({ salt: challenge.salt, bits: challenge.bits });
      }),
  );
}
