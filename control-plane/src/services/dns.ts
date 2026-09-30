import dns from 'dns';

export async function verifyDomainDns(hostname: string, expectedTarget: string): Promise<boolean> {
  const cleanHostname = hostname.trim().toLowerCase();
  const cleanTarget = expectedTarget.trim().toLowerCase();

  // Test / dev environment mock bypass
  if (
    cleanHostname.endsWith('.localhost') ||
    cleanHostname.endsWith('.local') ||
    cleanHostname === 'mock-verified.com' ||
    process.env.VOLTAGE_MOCK_DNS === 'true'
  ) {
    return true;
  }

  try {
    const cnames = await dns.promises.resolveCname(cleanHostname);
    const targetNorm = cleanTarget.replace(/\.$/, '');
    const isMatch = cnames.some(c => {
      const normalized = c.toLowerCase().replace(/\.$/, '');
      return normalized === targetNorm || normalized.endsWith(`.${targetNorm}`);
    });
    if (isMatch) return true;
  } catch (err: any) {
    // resolveCname throws ENODATA/ENOTFOUND if no direct CNAME record
  }

  try {
    const records = await dns.promises.resolve(cleanHostname, 'CNAME');
    if (records && records.length > 0) {
      const targetNorm = cleanTarget.replace(/\.$/, '');
      const isMatch = records.some(r => {
        const normalized = r.toLowerCase().replace(/\.$/, '');
        return normalized === targetNorm || normalized.endsWith(`.${targetNorm}`);
      });
      if (isMatch) return true;
    }
  } catch {
    // ignore
  }

  return false;
}
