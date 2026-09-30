import { describe, it, expect } from 'vitest';
import { verifyGitHubSignature } from '../services/webhook.js';
import crypto from 'crypto';

describe('verifyGitHubSignature', () => {
  const secret = 'my-secret';
  const payload = JSON.stringify({ action: 'push' });
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const validSignature = `sha256=${hmac}`;

  it('passes with valid signature', () => {
    expect(verifyGitHubSignature(payload, validSignature, secret)).toBe(true);
  });

  it('fails with invalid signature', () => {
    expect(verifyGitHubSignature(payload, 'sha256=invalid', secret)).toBe(false);
  });

  it('fails with missing signature', () => {
    expect(verifyGitHubSignature(payload, '', secret)).toBe(false);
  });

  it('fails with empty payload', () => {
    expect(verifyGitHubSignature('', validSignature, secret)).toBe(false);
  });

  it('fails with different algorithms', () => {
    const sha1Hmac = crypto.createHmac('sha1', secret).update(payload).digest('hex');
    expect(verifyGitHubSignature(payload, `sha1=${sha1Hmac}`, secret)).toBe(false);
  });
});
