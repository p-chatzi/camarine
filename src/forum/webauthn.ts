// Security keys and passkeys (WebAuthn) via @simplewebauthn/browser; the server side is py_webauthn.
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { api, type Me } from './api';

export const webauthnSupported = (): boolean => browserSupportsWebAuthn();

function explain(err: unknown): Error {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') return new Error('Opération annulée ou délai dépassé.');
  if (name === 'InvalidStateError') return new Error('Cette clé est déjà enregistrée sur votre compte.');
  if (name === 'SecurityError') return new Error('Les clés de sécurité ne fonctionnent qu’en HTTPS (ou sur localhost).');
  return err instanceof Error ? err : new Error('La clé n’a pas répondu.');
}

export async function addSecurityKey(name: string): Promise<Me> {
  const optionsJSON = await api<Parameters<typeof startRegistration>[0]['optionsJSON']>('/me/webauthn/options', { body: {} });
  let credential;
  try {
    credential = await startRegistration({ optionsJSON });
  } catch (err) {
    throw explain(err);
  }
  return api<Me>('/me/webauthn/register', { body: { credential, name } });
}

export async function loginWithSecurityKey(): Promise<void> {
  const optionsJSON = await api<Parameters<typeof startAuthentication>[0]['optionsJSON']>('/auth/mfa/webauthn/options', { body: {} });
  let credential;
  try {
    credential = await startAuthentication({ optionsJSON });
  } catch (err) {
    throw explain(err);
  }
  await api('/auth/mfa/webauthn', { body: { credential } });
}
