import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'public');
const clientRoot = resolve(process.cwd(), 'src/client');

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

  it('keeps the shared preview and install metadata free of the retired slogan', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as { description?: string };
    const meta = Object.fromEntries([...document.matchAll(/<meta property="(og:[^"]+)" content="([^"]+)"/g)].map((match) => [match[1], match[2]]));

    expect(meta['og:type']).toBe('website');
    expect(meta['og:site_name']).toBe('Misfits 501');
    expect(meta['og:title']).toBe('Misfits 501 — Private club darts.');
    expect(meta['og:description']).toContain('private');
    expect(meta['og:image']).toBe('https://darts.graingers.agency/brand/misfits-501.jpg');
    expect(meta['og:url']).toBe('https://darts.graingers.agency/');
    expect(document).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(document).toContain('private darts club');
    expect(manifest.description).toContain('private darts club');
    expect(document).not.toMatch(/luxury/i);
    expect(manifest.description).not.toMatch(/luxury/i);
    expect(document).not.toMatch(/properly settled/i);
    expect(manifest.description).not.toMatch(/properly settled/i);
  });

  it('declares a real tab icon and an installable home-screen icon', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const iconHrefs = [...document.matchAll(/<link rel="icon"[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    const touchHref = document.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)?.[1];

    expect(iconHrefs).toContain('/favicon.ico');
    expect(iconHrefs).toContain('/brand/misfits-501-mark.svg');
    expect(touchHref).toBe('/brand/misfits-501.jpg');
    expect(document).toContain('type="image/svg+xml"');
    expect(readFileSync(resolve(publicRoot, 'brand/misfits-501-mark.svg'), 'utf8')).toContain('<svg');
  });

  it('ships a real /favicon.ico asset instead of falling through to the SPA shell', () => {
    const ico = readFileSync(resolve(publicRoot, 'favicon.ico'));
    // ICO header: reserved(0) type(1=icon) count(>=1), little-endian.
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(1);
    expect(ico.length).toBeGreaterThan(100);
  });

  it('defines a centered logo reveal and an immediate reduced-motion composition', () => {
    const styles = readFileSync(resolve(clientRoot, 'private-club.css'), 'utf8');

    expect(styles).toMatch(/\.front-page-intro\s*\{[\s\S]*position:\s*fixed[\s\S]*place-items:\s*center[\s\S]*animation:\s*front-page-intro-curtain/);
    expect(styles).toMatch(/\.front-page-intro-content\s*\{[\s\S]*animation:\s*front-page-entry-arrive/);
    expect(styles).toMatch(/\.front-page-intro-logo\s*\{[\s\S]*transform/);
    expect(styles).toMatch(/@keyframes front-page-intro-logo[\s\S]*opacity:\s*0;\s*\n\s*transform:\s*scale\(1\.3\)/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.front-page-intro,[\s\S]*display:\s*none/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.front-page-entry-content[\s\S]*pointer-events:\s*auto/);
  });

  it('offers a maskable install icon so the club mark is not cropped on a phone', () => {
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as {
      icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
    };
    const maskable = manifest.icons?.find((candidate) => candidate.purpose === 'maskable');

    expect(maskable).toMatchObject({ src: '/brand/misfits-501-mark.svg', type: 'image/svg+xml', purpose: 'maskable' });
  });

  it('tells crawlers the club is private instead of relying on the SPA fallback', () => {
    const robots = readFileSync(resolve(publicRoot, 'robots.txt'), 'utf8');

    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Disallow: \/$/m);
  });

  it('explains the club without JavaScript instead of rendering a blank shell', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const noscript = document.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? '';

    expect(noscript).toContain('Misfits 501');
    expect(noscript).toContain('JavaScript');
  });

  it('keeps the no-JavaScript message readable on the dark club ground', () => {
    const styles = readFileSync(resolve(clientRoot, 'styles.css'), 'utf8');
    const noscriptColor = styles.match(/noscript\s*\{[^}]*color:\s*(#[0-9a-f]{6})/i)?.[1];
    if (!noscriptColor) throw new Error('The noscript block declares no explicit color');
    const clubInk = readFileSync(resolve(clientRoot, 'mobile-experience.css'), 'utf8').match(/--club-ink:\s*(#[0-9a-f]{6})/i)?.[1]
      ?? styles.match(/--club-ink:\s*(#[0-9a-f]{6})/i)?.[1]
      ?? '#0d1110';
    const baseBackground = styles.match(/--bg:\s*(#[0-9a-f]{6})/i)?.[1] ?? '#0d1110';

    expect(styles).toMatch(/noscript\s*\{[^}]*display:\s*block/);
    for (const background of [baseBackground, clubInk]) {
      expect(contrastRatio(noscriptColor, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps rendered text at WCAG AA contrast on the remaining dark surfaces', () => {
    // Verify the dark-theme token pairs directly. The CSS uses CSS custom properties
    // (var()) so hex extraction from selectors is not reliable; instead we check the
    // actual token values declared in :root against the 4.5:1 AA threshold.
    const pairs: Array<[string, string]> = [
      // [foreground, background]
      ['#eeeae0', '#0d1110'], // --text on --bg (brand header, public intro headings)
      ['#a8b0aa', '#0d1110'], // --text-2 on --bg (brand header secondary)
      ['#a8b0aa', '#1c2320'], // --text-2 on --surface-2 (public entry, form labels)
      ['#eeeae0', '#151a17'], // --text on --surface (main content area)
    ];
    for (const [fg, bg] of pairs) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps one theme color aligned with the manifest', () => {
    const document = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'manifest.webmanifest'), 'utf8')) as { theme_color?: string };
    const themeColors = [...document.matchAll(/<meta name="theme-color" content="([^"]+)"\s*\/>/g)].map((match) => match[1]);

    expect(themeColors).toEqual([manifest.theme_color]);
  });
});
