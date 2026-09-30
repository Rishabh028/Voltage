import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serveAsset, _clearManifestCache } from '../asset-server.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

vi.mock('@aws-sdk/client-s3', () => {
  const MockS3Client = vi.fn();
  MockS3Client.prototype.send = vi.fn();
  return {
    S3Client: MockS3Client,
    GetObjectCommand: vi.fn((args) => args),
  };
});

describe('Asset Server', () => {
  let req: Partial<IncomingMessage>;
  let res: any;
  let resHeaders: Record<string, string>;
  let resStatus: number;
  let resEndBody: string;
  let s3SendMock: any;

  beforeEach(() => {
    _clearManifestCache();
    resHeaders = {};
    resStatus = 200;
    resEndBody = '';
    
    req = {
      headers: { host: 'test.localhost' },
    };
    
    res = {
      writeHead: vi.fn((status, headers) => {
        resStatus = status;
        if (headers) Object.assign(resHeaders, headers);
        return res;
      }),
      end: vi.fn((body) => {
        resEndBody = body;
        return res;
      }),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn(),
    };
    
    s3SendMock = S3Client.prototype.send as any;
    s3SendMock.mockReset();
  });

  it('blocks path traversal: ../', async () => {
    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/../etc/passwd');
    expect(resStatus).toBe(400);
  });

  it('serves index.html with no-cache headers', async () => {
    s3SendMock.mockImplementation((cmd: any) => {
      if (cmd.Key.endsWith('manifest.json')) throw { name: 'NoSuchKey' };
      return {
        Body: Readable.from(['hello']),
        ContentLength: 5,
        ETag: '123',
      };
    });

    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/index.html');
    expect(resStatus).toBe(200);
    expect(resHeaders['Cache-Control']).toContain('no-cache');
  });

  it('serves hashed assets with immutable cache headers', async () => {
    s3SendMock.mockImplementation((cmd: any) => {
      if (cmd.Key.endsWith('manifest.json')) throw { name: 'NoSuchKey' };
      return {
        Body: Readable.from(['content']),
      };
    });

    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/main.a1b2c3d4.js');
    expect(resStatus).toBe(200);
    expect(resHeaders['Cache-Control']).toContain('immutable');
  });

  it('SPA fallback serves index.html for unknown paths', async () => {
    s3SendMock.mockImplementation(async (cmd: any) => {
      if (cmd.Key.endsWith('manifest.json')) {
        return {
          Body: {
            transformToString: async () => JSON.stringify({ isSPA: true, files: ['index.html', 'main.js'] })
          }
        };
      }
      if (cmd.Key.endsWith('index.html')) {
        return { Body: Readable.from(['index']) };
      }
      throw { name: 'NoSuchKey' };
    });

    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/some/unknown/route');
    expect(resStatus).toBe(200);
    expect(s3SendMock).toHaveBeenCalledWith(expect.objectContaining({ Key: 'dep-123/index.html' }));
  });

  it('Non-SPA returns 404 for unknown paths', async () => {
    s3SendMock.mockImplementation(async (cmd: any) => {
      if (cmd.Key.endsWith('manifest.json')) {
        return {
          Body: {
            transformToString: async () => JSON.stringify({ isSPA: false, files: ['index.html'] })
          }
        };
      }
      throw { name: 'NoSuchKey' };
    });

    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/some/unknown/route');
    expect(resStatus).toBe(404);
  });

  it('Missing file returns 404', async () => {
    s3SendMock.mockImplementation(async () => {
      throw { name: 'NoSuchKey' };
    });

    await serveAsset(req as IncomingMessage, res as ServerResponse, 'dep-123', '/missing.txt');
    expect(resStatus).toBe(404);
  });
});
