import { Router } from "express";
import bcrypt from "bcryptjs";
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
  const data = req.body as { full_name?: string; email?: string; current_password?: string; new_password?: string };

  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, req.session.userId!)).limit(1);
  if (!profiles.length) return res.status(404).json({ error: "Profile not found" });

  const allowed: Record<string, unknown> = {};
  if (data.full_name !== undefined) allowed.full_name = data.full_name;
  if (data.email !== undefined) allowed.email = data.email;

  if (data.new_password) {
    if (!data.current_password) return res.status(400).json({ error: "Current password is required" });
    const valid = await bcrypt.compare(data.current_password, profiles[0].password_hash ?? "");
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
    if (data.new_password.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
    allowed.password_hash = await bcrypt.hash(data.new_password, 10);
  }

  if (Object.keys(allowed).length === 0) return res.status(400).json({ error: "Nothing to update" });

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

router.post("/", requireRole("admin"), async (req, res) => {
  const { full_name, email, password, role, status } = req.body as {
    full_name: string; email: string; password: string; role: string; status?: string;
  };

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: "full_name, email, password, and role are required" });
  }
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const existing = await db.select().from(profilesTable).where(eq(profilesTable.email, email)).limit(1);
  if (existing.length) return res.status(409).json({ error: "Email already in use" });

  const password_hash = await bcrypt.hash(password, 10);
  const clerk_user_id = `local-${Date.now()}`;

  const [profile] = await db.insert(profilesTable).values({
    clerk_user_id,
    full_name,
    email,
    password_hash,
    role: role as "admin" | "storekeeper" | "technician" | "viewer",
    status: (status ?? "active") as "active" | "inactive",
  }).returning();

  const { password_hash: _, ...safe } = profile;
  return res.status(201).json(safe);
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body as { full_name?: string; email?: string; role?: string; status?: string; new_password?: string };

  const allowed: Record<string, unknown> = {};
  if (data.full_name !== undefined) allowed.full_name = data.full_name;
  if (data.email !== undefined) allowed.email = data.email;
  if (data.role !== undefined) allowed.role = data.role;
  if (data.status !== undefined) allowed.status = data.status;

  if (data.new_password) {
    if (data.new_password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    allowed.password_hash = await bcrypt.hash(data.new_password, 10);
  }

  if (Object.keys(allowed).length === 0) return res.status(400).json({ error: "Nothing to update" });

  const [profile] = await db.update(profilesTable).set(allowed).where(eq(profilesTable.id, id)).returning();
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { password_hash: _, ...safe } = profile;
  return res.json(safe);
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: "Cannot delete your own account" });
  const deleted = await db.delete(profilesTable).where(eq(profilesTable.id, id)).returning();
  if (!deleted.length) return res.status(404).json({ error: "Profile not found" });
  return res.json({ success: true });
});

export default router;
