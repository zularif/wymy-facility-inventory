import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  item_id: integer("item_id").notNull().references(() => itemsTable.id),
  movement_type: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  movement_date: text("movement_date").notNull(),
  reference_no: text("reference_no"),
  supplier: text("supplier"),
  department: text("department"),
  requested_by: text("requested_by"),
  issued_by: text("issued_by"),
  purpose: text("purpose"),
  remarks: text("remarks"),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, created_at: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
