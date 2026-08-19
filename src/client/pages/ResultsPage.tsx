import { useEffect, useState } from 'react';
import type { PublicResultDto } from '../../shared/api';
import { api, ApiClientError } from '../api/client';
import { ResultList } from '../components/ResultList';

export function ResultsPage() {
  const [results, setResults] = useState<PublicResultDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicResults(50)
      .then((response) => setResults(response.results))
      .catch((reason: unknown) => setError(reason instanceof ApiClientError ? reason.message : 'Results are unavailable.'));
  }, []);

  return (
    <main className="page">
      <h1>Results</h1>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      {results === null && !error ? <p className="loading-state">Loading results…</p> : null}
      {results ? <ResultList results={results} /> : null}
    </main>
  );
}
