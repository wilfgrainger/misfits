export interface LeagueShareBrowser {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: { writeText(value: string): Promise<void> };
}

export function publicLeaguePath(slug: string): string {
  return `/league/${encodeURIComponent(slug)}`;
}

export function buildLeagueUrl(slug: string, origin: string): string {
  return new URL(publicLeaguePath(slug), origin).toString();
}

export function publicLeagueKey(pathname: string): string | null {
  const match = pathname.match(/^\/league\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function shareLeague(
  browser: LeagueShareBrowser,
  name: string,
  slug: string,
  origin: string,
): Promise<'shared' | 'copied'> {
  const url = buildLeagueUrl(slug, origin);
  if (browser.share) {
    await browser.share({ title: name, text: `Join the ${name} league.`, url });
    return 'shared';
  }
  if (browser.clipboard?.writeText) {
    await browser.clipboard.writeText(url);
    return 'copied';
  }
  throw new Error('Sharing is not available in this browser.');
}
