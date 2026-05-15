import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.email, email)).limit(1);
  if (!profiles.length) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const profile = profiles[0];
  if (!profile.password_hash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, profile.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (profile.status !== "active") {
    return res.status(403).json({ error: "Account is inactive" });
  }

  req.session.userId = profile.id;
  req.session.userEmail = profile.email;
  req.session.userRole = profile.role;

  await new Promise<void>((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve()))
  );

  const { password_hash: _, ...safeProfile } = profile;
  return res.json({ profile: safeProfile });
});

router.get("/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profiles = await db.select().from(profilesTable).where(eq(profilesTable.id, req.session.userId)).limit(1);
  if (!profiles.length) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { password_hash: _, ...safeProfile } = profiles[0];
  return res.json({ profile: safeProfile });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

export default router;
