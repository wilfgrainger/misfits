export interface AuditEvent {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown | null;
  after: unknown | null;
}

export interface AuditRecordDto {
  id: number;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown | null;
  after: unknown | null;
  createdAt: string;
}

export function prepareAudit(
  db: D1Database,
  event: AuditEvent,
  createdAt = new Date().toISOString(),
): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    event.actorUserId,
    event.action,
    event.entityType,
    event.entityId,
    event.before === null ? null : JSON.stringify(event.before),
    event.after === null ? null : JSON.stringify(event.after),
    createdAt,
  );
}

export async function appendAudit(db: D1Database, event: AuditEvent): Promise<void> {
  await prepareAudit(db, event).run();
}

interface AuditRow {
  id: number;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}

function parseJson(value: string | null): unknown | null {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function listAudit(db: D1Database, limit = 100): Promise<AuditRecordDto[]> {
  const safeLimit = Math.max(1, Math.min(250, Math.trunc(limit)));
  const rows = await db.prepare(`
    SELECT
      a.id AS id,
      a.actor_user_id AS actorUserId,
      u.username AS actorUsername,
      a.action AS action,
      a.entity_type AS entityType,
      a.entity_id AS entityId,
      a.before_json AS beforeJson,
      a.after_json AS afterJson,
      a.created_at AS createdAt
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.actor_user_id
    ORDER BY a.id DESC
    LIMIT ?
  `).bind(safeLimit).all<AuditRow>();
  return rows.results.map((row) => ({
    id: row.id,
    actorUserId: row.actorUserId,
    actorUsername: row.actorUsername,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: parseJson(row.beforeJson),
    after: parseJson(row.afterJson),
    createdAt: row.createdAt,
  }));
}
