import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');

describe('white-label platform assets', () => {
  it('ships a generic install icon instead of an empty manifest icon list', () => {
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as {
      icons?: Array<{ src?: string; sizes?: string; type?: string }>;
    };
    const icon = manifest.icons?.find((candidate) => candidate.src === '/brand/league-board.svg');

    expect(icon).toMatchObject({ src: '/brand/league-board.svg', sizes: 'any', type: 'image/svg+xml' });
    expect(readFileSync(resolve(publicRoot, 'brand/league-board.svg'), 'utf8')).toContain('<svg');
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
