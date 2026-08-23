import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const agentPath = resolve(root, '.github/agents/superpowers.agent.md');
const skillsRoot = resolve(root, '.github/skills/superpowers');

const requiredSkills = [
  'brainstorming',
  'dispatching-parallel-agents',
  'executing-plans',
  'finishing-a-development-branch',
  'receiving-code-review',
  'requesting-code-review',
  'subagent-driven-development',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
  'using-superpowers',
  'verification-before-completion',
  'writing-plans',
  'writing-skills',
] as const;

describe('repo-native Superpowers Copilot agent', () => {
  it('vendors the complete Superpowers skill set and routes through repository authority', () => {
    expect(existsSync(agentPath)).toBe(true);

    for (const skill of requiredSkills) {
      expect(existsSync(resolve(skillsRoot, skill, 'SKILL.md')), `${skill} is vendored`).toBe(true);
    }

    expect(existsSync(resolve(skillsRoot, 'LICENSE'))).toBe(true);
    expect(existsSync(resolve(skillsRoot, 'UPSTREAM.md'))).toBe(true);

    const agent = readFileSync(agentPath, 'utf8');
    expect(agent).toContain('AGENTS.md');
    expect(agent).toContain('.github/skills/superpowers/using-superpowers/SKILL.md');
    expect(agent).toContain('Cloudflare free tier');
    expect(agent).toContain('Impeccable');
    expect(agent).toContain('Cave Pony');
  });
});
