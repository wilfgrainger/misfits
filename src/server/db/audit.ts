export interface AuditEvent {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown | null;
  after: unknown | null;
}

export async function appendAudit(db: D1Database, event: AuditEvent): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    event.actorUserId,
    event.action,
    event.entityType,
    event.entityId,
    event.before === null ? null : JSON.stringify(event.before),
    event.after === null ? null : JSON.stringify(event.after),
    new Date().toISOString(),
  ).run();
}
