import { describe, it, expect, vi, beforeEach } from 'vitest';
import dns from 'dns';
import { verifyDomainDns } from '../services/dns.js';

describe('DNS Verification Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bypasses DNS query for .localhost or .local hostnames', async () => {
    const result = await verifyDomainDns('sub.voltage.localhost', 'cname.voltage.run');
    expect(result).toBe(true);
  });

  it('returns true when CNAME matches target exactly', async () => {
    vi.spyOn(dns.promises, 'resolveCname').mockResolvedValueOnce(['cname.voltage.run']);
    const result = await verifyDomainDns('app.customdomain.com', 'cname.voltage.run');
    expect(result).toBe(true);
  });

  it('returns true when CNAME has trailing dot from DNS query', async () => {
    vi.spyOn(dns.promises, 'resolveCname').mockResolvedValueOnce(['cname.voltage.run.']);
    const result = await verifyDomainDns('app.customdomain.com', 'cname.voltage.run');
    expect(result).toBe(true);
  });

  it('returns false when CNAME points elsewhere', async () => {
    vi.spyOn(dns.promises, 'resolveCname').mockResolvedValueOnce(['some-other-target.com']);
    vi.spyOn(dns.promises, 'resolve').mockRejectedValueOnce(new Error('ENODATA'));
    const result = await verifyDomainDns('app.customdomain.com', 'cname.voltage.run');
    expect(result).toBe(false);
  });

  it('returns false when DNS resolution fails with ENOTFOUND', async () => {
    vi.spyOn(dns.promises, 'resolveCname').mockRejectedValueOnce(new Error('ENOTFOUND'));
    vi.spyOn(dns.promises, 'resolve').mockRejectedValueOnce(new Error('ENOTFOUND'));
    const result = await verifyDomainDns('nonexistent.customdomain.com', 'cname.voltage.run');
    expect(result).toBe(false);
  });
});
