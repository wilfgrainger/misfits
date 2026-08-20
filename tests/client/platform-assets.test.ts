import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');

describe('Misfits platform assets', () => {
  it('ships the supplied club artwork as its install icon', () => {
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as {
      icons?: Array<{ src?: string; sizes?: string; type?: string }>;
    };
    const icon = manifest.icons?.find((candidate) => candidate.src === '/brand/misfits-501.jpg');

    expect(icon).toMatchObject({ src: '/brand/misfits-501.jpg', sizes: '1254x1254', type: 'image/jpeg' });
    expect(readFileSync(resolve(publicRoot, 'brand/misfits-501.jpg')).length).toBeGreaterThan(1000);
  });

  it('allows Google button styles without allowing inline scripts', () => {
    const headers = readFileSync(resolve(publicRoot, '_headers'), 'utf8');
    const policy = headers.match(/Content-Security-Policy: ([^\r\n]+)/)?.[1] ?? '';
    const scriptSource = policy.match(/script-src ([^;]+)/)?.[1] ?? '';
    const styleSource = policy.match(/style-src ([^;]+)/)?.[1] ?? '';

    expect(styleSource).toContain("'unsafe-inline'");
    expect(scriptSource).not.toContain("'unsafe-inline'");
  });
});
