import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
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
  const selectedLeagueRef = useRef<string | null>(props.selectedLeagueId ?? null);
  const resultsActiveRef = useRef(false);
  const [resultsActive, setResultsActive] = useState(false);
  const [activeResultsLeagueId, setActiveResultsLeagueId] = useState(props.selectedLeagueId ?? null);
  const [resultsPanel, setResultsPanel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    selectedLeagueRef.current = props.selectedLeagueId ?? selectedLeagueRef.current;
    if (resultsActiveRef.current && props.selectedLeagueId) setActiveResultsLeagueId(props.selectedLeagueId);
  }, [props.selectedLeagueId]);

  useEffect(() => {
    if (!resultsActive) {
      setResultsPanel(null);
      return;
    }

    const panel = shellRef.current?.querySelector<HTMLElement>('.admin-competition-desk > [role="tabpanel"]:not([hidden])') ?? null;
    if (!panel) return;

    const legacyContent = panel.firstElementChild instanceof HTMLElement ? panel.firstElementChild : null;
    if (legacyContent) legacyContent.hidden = true;
    setResultsPanel(panel);

    return () => {
      if (legacyContent) legacyContent.hidden = false;
    };
  }, [resultsActive, activeResultsLeagueId]);

  const handleLeagueSelected = (league: LeagueSummary | null) => {
    const leagueId = league?.id ?? null;
    selectedLeagueRef.current = leagueId;
    if (resultsActiveRef.current) setActiveResultsLeagueId(leagueId);
    props.onLeagueSelected?.(league);
  };

  const updateActiveTab = (name: string | null) => {
    if (!name) return;
    const nextResultsActive = name === 'Results';
    resultsActiveRef.current = nextResultsActive;
    if (nextResultsActive) setActiveResultsLeagueId(selectedLeagueRef.current);
    setResultsActive(nextResultsActive);
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
      onLeagueSelected={handleLeagueSelected}
    />
    {resultsActive && activeResultsLeagueId && resultsPanel && createPortal(
      <AdminResultsWorkflow leagueId={activeResultsLeagueId} />,
      resultsPanel,
    )}
  </div>;
}
