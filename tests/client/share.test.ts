import { describe, expect, it, vi } from 'vitest';
import { buildLeagueUrl, publicLeagueKey, shareLeague } from '../../src/client/share';

describe('league sharing', () => {
  it('builds a stable public league path and reads it back from the browser path', () => {
    const url = buildLeagueUrl('Tuesday / 501', 'https://darts.example');
    expect(url).toBe('https://darts.example/league/Tuesday%20%2F%20501');
    expect(publicLeagueKey('/league/Tuesday%20%2F%20501')).toBe('Tuesday / 501');
    expect(publicLeagueKey('/join/invite-token')).toBeNull();
  });

  it('uses the native share sheet when the browser provides it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareLeague({ share }, 'Premier', 'premier', 'https://darts.example')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Premier — Misfits 501', text: 'See the Premier table.', url: 'https://darts.example/league/premier' });
  });

  it('copies a public league link when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareLeague({ clipboard: { writeText } }, 'Misfits 501', 'misfits-501', 'https://darts.example')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://darts.example/league/misfits-501');
  });

  it('falls back to the clipboard when the desktop share target rejects the native sheet', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('Share failed'), { name: 'AbortError' }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareLeague({ share, clipboard: { writeText } }, 'Misfits 501', 'misfits-501', 'https://darts.example')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://darts.example/league/misfits-501');
  });
});
