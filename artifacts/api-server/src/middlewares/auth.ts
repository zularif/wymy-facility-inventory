import { Request, Response, NextFunction } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userEmail: string;
    userRole: string;
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const profile = await db.select().from(profilesTable).where(eq(profilesTable.id, req.session.userId)).limit(1);
    if (!profile.length || !roles.includes(profile[0].role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};

export const getSessionUser = (req: Request) => {
  return {
    id: req.session?.userId,
    email: req.session?.userEmail,
    role: req.session?.userRole,
  };
};
