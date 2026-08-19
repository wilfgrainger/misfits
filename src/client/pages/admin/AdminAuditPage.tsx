import { useEffect, useState } from 'react';
import { api, ApiClientError, type AuditRecordDto } from '../../api/client';

export function AdminAuditPage() {
  const [audit, setAudit] = useState<AuditRecordDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.getAdminAudit().then((response) => setAudit(response.audit)).catch((reason) => setError(reason instanceof ApiClientError ? reason.message : 'Audit history could not be loaded.'));
  }, []);
  return (
    <section className="admin-section">
      <h2>Audit</h2>
      {error ? <p role="alert" className="error-panel">{error}</p> : null}
      <div className="audit-list">
        {audit?.map((entry) => (
          <article className="panel audit-row" key={entry.id}>
            <div><strong>{entry.action}</strong><span>{entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ''}</span></div>
            <div><span>{entry.actorUsername ?? 'System'}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-GB')}</time></div>
          </article>
        ))}
      </div>
    </section>
  );
}
