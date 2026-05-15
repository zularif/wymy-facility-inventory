import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  item_code: text("item_code").notNull().unique(),
  item_name: text("item_name").notNull(),
  spec: text("spec"),
  category: text("category"),
  unit: text("unit").notNull(),
  location: text("location"),
  min_stock: integer("min_stock"),
  minimum_order: integer("minimum_order"),
  opening_stock: integer("opening_stock").notNull().default(0),
  photo_url: text("photo_url"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
