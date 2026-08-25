import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = resolve(process.cwd(), 'src/client');

describe('admin touch targets', () => {
  it('keeps compact administrative controls at the 44px touch floor', () => {
    const sharedStyles = readFileSync(resolve(clientRoot, 'styles.css'), 'utf8');
    const privateClubStyles = readFileSync(resolve(clientRoot, 'private-club.css'), 'utf8');

    expect(sharedStyles).toMatch(/\.segmented-tab\s*\{[^}]*min-height:\s*44px/);
    expect(sharedStyles).toMatch(/\.admin-list \.action-button\s*\{[^}]*min-height:\s*44px/);
    expect(sharedStyles).toMatch(/\.admin-competition-desk\[data-admin-layout="control-room"\][\s\S]*grid-template-columns:\s*15rem/);
    expect(sharedStyles).toMatch(/\.admin-competition-desk\[data-admin-layout="control-room"\] \.admin-rail[\s\S]*position:\s*sticky/);
    expect(privateClubStyles).toMatch(/\.compact-button\s*\{[^}]*min-height:\s*44px/);
  });
});
