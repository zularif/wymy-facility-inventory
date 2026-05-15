import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, req.session.userId!)).limit(1);
  if (!profiles.length) return res.status(404).json({ error: "Profile not found" });
  const { password_hash: _, ...safe } = profiles[0];
  return res.json(safe);
});

router.patch("/me", requireAuth, async (req, res) => {
  const data = req.body;
  const allowed = { full_name: data.full_name };

  const [profile] = await db.update(profilesTable).set(allowed).where(eq(profilesTable.id, req.session.userId!)).returning();
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { password_hash: _, ...safe } = profile;
  return res.json(safe);
});

router.get("/", requireRole("admin"), async (req, res) => {
  const profiles = await db.select().from(profilesTable);
  const safe = profiles.map(({ password_hash: _, ...p }) => p);
  return res.json(safe);
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;

  const allowed: Record<string, unknown> = {};
  if (data.full_name !== undefined) allowed.full_name = data.full_name;
  if (data.role !== undefined) allowed.role = data.role;
  if (data.status !== undefined) allowed.status = data.status;

  const [profile] = await db.update(profilesTable).set(allowed).where(eq(profilesTable.id, id)).returning();
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { password_hash: _, ...safe } = profile;
  return res.json(safe);
});

export default router;
