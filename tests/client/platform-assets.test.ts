import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');

function lastHexDeclaration(styles: string, selector: string, property: string): string {
  const blocks = /([^{}]+)\{([^{}]*)\}/g;
  let value: string | undefined;

  for (const match of styles.matchAll(blocks)) {
    if (!match[1].split(',').map((item) => item.trim()).includes(selector)) continue;
    const declaration = match[2].match(new RegExp(`${property}\\s*:\\s*([^;]+)`))?.[1];
    const hex = declaration?.match(/#[0-9a-f]{6}/i)?.[0];
    if (hex) value = hex;
  }

  if (!value) throw new Error(`No hex ${property} found for ${selector}`);
  return value;
}

function contrastRatio(foreground: string, background: string): number {
  const channels = (hex: string) => [0, 2, 4].map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = (hex: string) => {
    const [red, green, blue] = channels(hex);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const light = luminance(foreground);
  const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

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

  it('describes a luxury private-club experience in the document metadata', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(document).toContain('luxury private-club darts league');
  });

  it('keeps rendered text at WCAG AA contrast on the remaining dark surfaces', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/client/styles.css'), 'utf8');
    const darkText = [
      ['.brand-header', '.brand-name'],
      ['.brand-header', '.online-label'],
      ['.brand-header', '.header-signout'],
      ['.public-intro', '.public-intro h1'],
      ['.public-intro', '.public-intro p'],
    ] as const;

    for (const [surface, text] of darkText) {
      const foreground = lastHexDeclaration(styles, text, 'color');
      const background = lastHexDeclaration(styles, surface, 'background');
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps one theme color aligned with the manifest', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as { theme_color?: string };
    const themeColors = [...document.matchAll(/<meta name="theme-color" content="([^"]+)"\s*\/>/g)].map((match) => match[1]);

    expect(themeColors).toEqual([manifest.theme_color]);
  });
});
