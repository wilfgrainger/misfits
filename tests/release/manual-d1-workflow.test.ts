import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve(process.cwd(), '.github/workflows/manual-d1-migration.yml');

describe('production D1 management workflow', () => {
  it('requires explicit confirmation and an immutable SHA, verifies it, migrates D1, and never deploys application code', () => {
    const workflow = readFileSync(workflowPath, 'utf8').replace(/\r\n/g, '\n');

    expect(workflow).toContain('name: Production D1 management');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('migration_sha:');
    expect(workflow).toContain('confirmation:');
    expect(workflow).toContain("inputs.confirmation == 'APPLY-D1'");
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('ref: ${{ inputs.migration_sha }}');
    expect(workflow).toContain('^[0-9a-f]{40}$');

    for (const command of ['npm ci', 'npx wrangler types', 'npm run typecheck', 'npm test', 'npm run build', 'git diff --check']) {
      expect(workflow).toContain(command);
    }

    expect(workflow).toContain('npm run db:migrate:remote');
    expect(workflow.match(/npx wrangler d1 migrations list misfits --remote/g)?.length).toBe(2);
    expect(workflow).toContain("PRAGMA quick_check");
    expect(workflow).toContain("SELECT name, type, sql FROM sqlite_schema");
    expect(workflow).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(workflow).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');

    expect(workflow).not.toContain('PRAGMA table_info(users)');
    expect(workflow).not.toContain("name='club_invites'");
    expect(workflow).not.toContain('SELECT club_status, COUNT(*) FROM users GROUP BY club_status');
    expect(workflow).not.toContain('SELECT visibility, COUNT(*) FROM leagues GROUP BY visibility');
    expect(workflow).not.toContain('wrangler deploy');
    expect(workflow).not.toContain('npm run deploy');
    expect(workflow).not.toContain('cloudflare/wrangler-action');
    expect(workflow).not.toContain('\n  push:');
    expect(workflow).not.toContain('\n  pull_request:');
    expect(workflow).not.toContain('\n  schedule:');
  });
});
