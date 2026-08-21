import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
const workflowLines = workflow.split('\n');

function jobBlock(jobName: string): string {
  const start = workflowLines.indexOf(`  ${jobName}:`);
  if (start === -1) return '';

  const nextJob = workflowLines.slice(start + 1).findIndex((line) => /^  [a-z0-9_-]+:$/.test(line));
  const end = nextJob === -1 ? workflowLines.length : start + 1 + nextJob;
  return workflowLines.slice(start, end).join('\n');
}

function triggerBlock(triggerName: string): string {
  const onStart = workflowLines.indexOf('on:');
  const jobsStart = workflowLines.indexOf('jobs:');
  const start = workflowLines.indexOf(`  ${triggerName}:`, onStart);
  if (onStart === -1 || jobsStart === -1 || start === -1 || start > jobsStart) return '';

  const nextTrigger = workflowLines
    .slice(start + 1, jobsStart)
    .findIndex((line) => /^  [a-z0-9_-]+:$/.test(line));
  const end = nextTrigger === -1 ? jobsStart : start + 1 + nextTrigger;
  return workflowLines.slice(start, end).join('\n');
}

describe('production deployment workflow', () => {
  it('deploys only after verification on pushes to main', () => {
    const verifyJob = jobBlock('verify');
    const deployJob = jobBlock('deploy');
    const jobsStart = workflowLines.indexOf('jobs:');
    const pushTrigger = triggerBlock('push');
    const jobNames = workflowLines
      .slice(jobsStart + 1)
      .filter((line) => /^  [a-z0-9_-]+:$/.test(line))
      .map((line) => line.trim().slice(0, -1));

    expect(pushTrigger).toContain('push:');
    expect(pushTrigger).toBe('  push:');
    expect(workflow).toContain('\n  pull_request:\n');
    expect(jobNames).toEqual(['verify', 'deploy']);
    expect(verifyJob).toContain('npm test');
    expect(verifyJob).toContain('npm run build');
    expect(deployJob).toContain('needs: verify');
    expect(deployJob).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'");
    expect(deployJob).toContain('cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0');
    expect(deployJob).toContain('command: deploy --keep-vars');
    expect(deployJob).toContain('apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(deployJob).toContain('accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(deployJob).not.toContain('db:migrate:remote');
    expect(workflow).not.toContain('db:migrate:remote');
    expect(workflow).not.toContain('--remote');
    expect(workflow).not.toMatch(/^\s+- run: (?:npm run deploy|(?:npx )?wrangler deploy)\b/m);
    expect(verifyJob).not.toMatch(/(?:npm run deploy|wrangler deploy|migrations apply.*--remote)/);
    expect(workflow.match(/cloudflare\/wrangler-action@/g)).toHaveLength(1);
  });
});
