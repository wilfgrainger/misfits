import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('repository package-manager authority', () => {
  it('uses npm only', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { packageManager?: string };
    expect(pkg.packageManager).toMatch(/^npm@\d+\.\d+\.\d+$/);
    expect(existsSync('package-lock.json')).toBe(true);
    expect(existsSync('pnpm-lock.yaml')).toBe(false);
  });
});
