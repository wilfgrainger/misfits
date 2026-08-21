import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { LeagueSummary, UserSummary } from '../api';
import { AdminCompetitionDesk as CompetitionDeskV2 } from './AdminCompetitionDeskV2';
import { AdminResultsWorkflow } from './AdminResultsWorkflow';

interface Props {
  user: UserSummary;
  selectedLeagueId?: string | null;
  onLeagueSelected?: (league: LeagueSummary | null) => void;
  onLeagueCreated?: (league: LeagueSummary) => void;
  onLeagueChanged?: (league: LeagueSummary) => void;
}

function tabName(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const tab = target.closest('button[role="tab"]');
  return tab?.textContent?.trim() ?? null;
}

export function AdminCompetitionDesk(props: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [resultsActive, setResultsActive] = useState(false);
  const [activeLeagueId, setActiveLeagueId] = useState(props.selectedLeagueId ?? null);

  useEffect(() => {
    if (props.selectedLeagueId) setActiveLeagueId(props.selectedLeagueId);
  }, [props.selectedLeagueId]);

  useEffect(() => {
    if (!resultsActive) return;
    const panel = shellRef.current?.querySelector<HTMLElement>('.admin-competition-desk > [role="tabpanel"]:not([hidden])');
    if (!panel) return;
    panel.hidden = true;
    return () => { panel.hidden = false; };
  }, [resultsActive, activeLeagueId]);

  const handleLeagueSelected = (league: LeagueSummary | null) => {
    setActiveLeagueId(league?.id ?? null);
    props.onLeagueSelected?.(league);
  };

  const updateActiveTab = (name: string | null) => {
    if (name) setResultsActive(name === 'Results');
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => updateActiveTab(tabName(event.target));
  const handleKeyUpCapture = (_event: KeyboardEvent<HTMLDivElement>) => updateActiveTab(tabName(document.activeElement));

  return <div
    ref={shellRef}
    className={resultsActive ? 'competition-desk-shell competition-desk-shell-results' : 'competition-desk-shell'}
    onClickCapture={handleClickCapture}
    onKeyUpCapture={handleKeyUpCapture}
  >
    <CompetitionDeskV2
      {...props}
      selectedLeagueId={activeLeagueId}
      onLeagueSelected={handleLeagueSelected}
    />
    {resultsActive && activeLeagueId && <AdminResultsWorkflow leagueId={activeLeagueId} />}
  </div>;
}
