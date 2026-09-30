import crypto from 'crypto';

export function verifyGitHubSignature(payload: string | Buffer, signature: string, secret: string): boolean {
  if (!payload || !signature || !secret) return false;
  
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}
