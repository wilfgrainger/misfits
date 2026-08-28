import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = resolve(process.cwd(), 'src/client');

/**
 * `DESIGN.md` names the acceptance widths the club must survive and requires an
 * overflow/touch-target audit at each one. A browser is not available here, so
 * this suite proves the static responsive contract instead: every required width
 * resolves to a declared layout band, the page container cannot scroll
 * horizontally, and the fixed member navigation respects the device safe area.
 */
const REQUIRED_WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024];

function clientStylesheets(): Array<[string, string]> {
  return readdirSync(clientRoot)
    .filter((name) => name.endsWith('.css'))
    .map((name) => [name, readFileSync(resolve(clientRoot, name), 'utf8')]);
}

type Band = { kind: 'max' | 'min'; px: number };

function widthBands(styles: string): Band[] {
  return [...styles.matchAll(/@media\s*\((max|min)-width:\s*(\d+)px\)/g)]
    .map((match) => ({ kind: match[1] as Band['kind'], px: Number(match[2]) }));
}

describe('responsive acceptance widths', () => {
  const sheets = clientStylesheets();
  const allStyles = sheets.map(([, styles]) => styles).join('\n');
  const bands = widthBands(allStyles);

  it('declares at least one width band, and every required width lands inside one', () => {
    expect(bands.length).toBeGreaterThan(0);

    for (const width of REQUIRED_WIDTHS) {
      const matched = bands.filter((band) => (band.kind === 'max' ? width <= band.px : width >= band.px));
      expect(matched, `no declared width band applies at ${width}px`).not.toHaveLength(0);
    }
  });

  it('keeps a deliberate phone band, a tablet band and a desktop band', () => {
    const narrowest = Math.min(...REQUIRED_WIDTHS);
    const phone = bands.some((band) => band.kind === 'max' && band.px >= narrowest && band.px < 768);
    const tablet = bands.some((band) => band.kind === 'min' && band.px > narrowest && band.px <= 768);
    const desktop = bands.some((band) => band.kind === 'min' && band.px > 768 && band.px <= 1024);

    expect({ phone, tablet, desktop }).toEqual({ phone: true, tablet: true, desktop: true });
  });

  it('prevents page-level horizontal overflow at the narrowest supported width', () => {
    const mobile = readFileSync(resolve(clientRoot, 'mobile-experience.css'), 'utf8');
    const base = readFileSync(resolve(clientRoot, 'styles.css'), 'utf8');

    expect(mobile).toMatch(/html,\s*body,\s*#root,\s*\.experience-shell\s*\{[^}]*overflow-x:\s*hidden/);
    expect(mobile).toMatch(/html,\s*body,\s*#root,\s*\.experience-shell\s*\{[^}]*max-width:\s*100%/);
    expect(base).toMatch(/body\s*\{[^}]*min-width:\s*320px/);
    expect(Math.min(...REQUIRED_WIDTHS)).toBe(320);
  });

  it('never pins a layout wider than the narrowest supported width', () => {
    const offenders: string[] = [];

    for (const [name, styles] of sheets) {
      // Breakpoint preludes legitimately name widths above 320px; only declarations count.
      const declarations = styles.replace(/@media[^{]*/g, '@media');
      for (const match of declarations.matchAll(/(?:^|[^-\w])(min-width|width)\s*:\s*(\d+)px/g)) {
        if (Number(match[2]) > 320) offenders.push(`${name}: ${match[1]}: ${match[2]}px`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps the fixed member navigation clear of the device safe area', () => {
    const navSheets = sheets.filter(([, styles]) => /env\(safe-area-inset-bottom\)/.test(styles));

    expect(navSheets.length).toBeGreaterThan(0);
    for (const [, styles] of navSheets) {
      expect(styles).toMatch(/env\(safe-area-inset-bottom\)/);
    }
    expect(allStyles).toMatch(/padding-bottom:\s*calc\([^)]*env\(safe-area-inset-bottom\)\)|padding:[^;]*env\(safe-area-inset-bottom\)/);
  });

  it('makes the private-club safeguards real on cutout phones and for keyboard users', () => {
    const entry = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const privateEntry = readFileSync(resolve(clientRoot, 'private-club.css'), 'utf8');
    const memberShell = readFileSync(resolve(clientRoot, 'club-app.css'), 'utf8');
    const mobile = readFileSync(resolve(clientRoot, 'mobile-experience.css'), 'utf8');

    expect(entry).toMatch(/<meta\s+name="viewport"\s+content="[^"\n]*viewport-fit=cover[^"\n]*"\s*\/>/);
    expect(privateEntry).toMatch(/\.private-entry-state\.private-entry-v2\s*\{[^}]*padding:\s*max\(clamp\([^;]*env\(safe-area-inset-top\)[^;]*env\(safe-area-inset-right\)[^;]*env\(safe-area-inset-bottom\)[^;]*env\(safe-area-inset-left\)/s);
    expect(privateEntry).toMatch(/\.private-admission-card\s+\.google-button-slot[\s\S]*?\.private-admission-card iframe\s*\{[^}]*width:\s*100%\s*!important/);
    expect(memberShell).toMatch(/\.club-member-content\s*\{[^}]*padding:[^;]*env\(safe-area-inset-bottom\)/);
    expect(memberShell).toMatch(/\.club-member-nav\s+\.member-app-nav-item\s*\{[^}]*min-height:\s*54px/);
    expect(privateEntry + memberShell).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--club-red-strong\)/);
    expect(mobile).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('keeps every admin task visible in a phone grid instead of a horizontal drag rail', () => {
    const memberShell = readFileSync(resolve(clientRoot, 'club-app.css'), 'utf8');

    expect(memberShell).toMatch(/@media\s*\(max-width:\s*680px\)\s*\{[\s\S]*?\.admin-competition-desk\s+\.admin-rail\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[\s\S]*?overflow:\s*visible/s);
    expect(memberShell).toMatch(/\.admin-competition-desk\s+\.admin-rail\s+\.content-tab:last-child\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/s);
  });

  it('keeps Home intentionally two-column only when desktop width is available', () => {
    const memberShell = readFileSync(resolve(clientRoot, 'club-app.css'), 'utf8');

    expect(memberShell).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*?\.club-home\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.2fr\)\s+minmax\(18rem,\s*0\.8fr\)/);
    expect(memberShell).toMatch(/\.club-home-primary,[\s\S]*?\.club-home-attention\s*\{[\s\S]*?align-content:\s*start/);
  });
});
