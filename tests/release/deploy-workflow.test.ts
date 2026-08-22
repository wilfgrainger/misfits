import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8').replace(/\r\n/g, '\n');
const lines = workflow.split('\n');

function jobBlock(jobName: string): string {
  const start = lines.indexOf(`  ${jobName}:`);
  if (start === -1) return '';
  const next = lines.slice(start + 1).findIndex((line) => /^  [a-z0-9_-]+:$/.test(line));
  return lines.slice(start, next === -1 ? lines.length : start + 1 + next).join('\n');
}

describe('production deployment workflow', () => {
  it('keeps verification mandatory and production deployment main-only', () => {
    const verify = jobBlock('verify');
    const deploy = jobBlock('deploy');

    expect(workflow).toContain('\n  push:\n');
    expect(workflow).toContain('\n  pull_request:\n');

    for (const command of ['npm ci', 'npx wrangler types', 'npm run typecheck', 'npm test', 'npm run build']) {
      expect(verify).toContain(command);
    }

    expect(deploy).toContain('needs: verify');
    expect(deploy).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(deploy).toContain('cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0');
    expect(deploy).toContain('command: deploy --keep-vars');
    expect(deploy).toContain('apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(deploy).toContain('accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');

    expect(workflow).not.toContain('db:migrate:remote');
    expect(workflow).not.toContain('--remote');
    expect(verify).not.toMatch(/(?:npm run deploy|wrangler deploy|migrations apply.*--remote)/);
  });
});
