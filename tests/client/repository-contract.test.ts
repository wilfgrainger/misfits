import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('repository operating contract', () => {
  it('provides an unambiguous agent entry point and PR review record', () => {
    const agents = readFileSync('AGENTS.md', 'utf8');
    expect(agents).toContain('PRODUCT.md');
    expect(agents).toContain('VISION.md');
    expect(agents.indexOf('`PRODUCT.md`')).toBeLessThan(agents.indexOf('`VISION.md`'));
    expect(agents).toContain('Do not pin this entry point to a dated spec filename');
    expect(agents).toContain('DESIGN.md');
    expect(agents).toContain('Impeccable is the UI authority');
    expect(agents).toContain('Superpowers governs delivery');
    expect(agents).toContain('Cave Pony is the simplicity gate');
    expect(agents).toContain('.agents/skills/impeccable/');
    expect(agents).toContain('$impeccable critique');
    expect(readFileSync('VISION.md', 'utf8')).toContain('one private club');
    expect(readFileSync('PROGRESS.md', 'utf8')).toContain('Current branch');
    expect(readFileSync('.github/pull_request_template.md', 'utf8')).toContain('Cave Pony');
  });

  it('defines distinct member and admin desktop workbenches in the club visual system', () => {
    const css = readFileSync('src/client/styles.css', 'utf8');
    expect(css).toContain('--ink:');
    expect(css).toContain('--paper:');
    expect(css).toContain('--club-red:');
    expect(css).not.toContain('Club record redesign');
    expect(css).not.toContain('Misfits 501 club finish');
    expect(css).toContain('.member-workbench');
    expect(css).toContain('.admin-workbench');
    expect(css).toContain('@media (min-width: 960px)');
    expect(css).not.toContain('font-family: Inter');
  });
});
