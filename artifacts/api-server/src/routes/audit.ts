import { Router } from "express";
import { db, auditLogTable, profilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { table_name, user_id, date_from, date_to, limit, offset } = req.query as Record<string, string>;

  const logs = await db
    .select({
      id: auditLogTable.id,
      user_id: auditLogTable.user_id,
      action: auditLogTable.action,
      table_name: auditLogTable.table_name,
      record_id: auditLogTable.record_id,
      description: auditLogTable.description,
      created_at: auditLogTable.created_at,
    })
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.created_at));

  const profiles = await db.select({ id: profilesTable.id, email: profilesTable.email }).from(profilesTable);
  const profileMap = new Map(profiles.map(p => [String(p.id), p.email]));

  let filtered = logs.map(l => ({ ...l, user_email: profileMap.get(l.user_id) ?? null }));

  if (table_name) filtered = filtered.filter(l => l.table_name === table_name);
  if (user_id) filtered = filtered.filter(l => l.user_id === user_id);
  if (date_from) filtered = filtered.filter(l => l.created_at.toISOString().split("T")[0] >= date_from);
  if (date_to) filtered = filtered.filter(l => l.created_at.toISOString().split("T")[0] <= date_to);

  const off = offset ? parseInt(offset) : 0;
  const lim = limit ? parseInt(limit) : filtered.length;

  return res.json(filtered.slice(off, off + lim));
});

export default router;
