export interface DraftMembershipPlacement {
  userId: string;
  leagueId: string;
}

export async function copyMembershipBaseline(fromSeasonId: string, toSeasonId: string): Promise<{ placements: DraftMembershipPlacement[] }> {
  const response = await fetch(`/api/admin/seasons/${encodeURIComponent(fromSeasonId)}/members/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toSeasonId }),
  });
  const payload = await response.json().catch(() => null) as { placements?: DraftMembershipPlacement[]; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Draft baseline placements could not be copied.');
  return { placements: payload?.placements ?? [] };
}
