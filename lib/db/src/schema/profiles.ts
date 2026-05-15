import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  clerk_user_id: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  full_name: text("full_name"),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("active"),
  password_hash: text("password_hash"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, created_at: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
