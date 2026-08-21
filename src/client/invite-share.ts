export interface InviteShareBrowser {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: { writeText(value: string): Promise<void> };
}

export async function shareInvite(browser: InviteShareBrowser, url: string): Promise<'shared' | 'copied'> {
  if (browser.share) {
    try {
      await browser.share({ title: 'Misfits 501 league invite', text: 'Join this Misfits 501 league.', url });
      return 'shared';
    } catch (cause) {
      const error = cause as { name?: string };
      if (!browser.clipboard?.writeText || !['AbortError', 'NotAllowedError', 'TypeError'].includes(error.name ?? '')) throw cause;
    }
  }
  if (browser.clipboard?.writeText) {
    await browser.clipboard.writeText(url);
    return 'copied';
  }
  throw new Error('Sharing is not available in this browser.');
}
