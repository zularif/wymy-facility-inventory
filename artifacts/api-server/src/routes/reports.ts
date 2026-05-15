import { Router } from "express";
import { db, itemsTable, stockMovementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getAllItemsWithStock() {
  const items = await db.select().from(itemsTable);
  const allMovements = await db.select({
    item_id: stockMovementsTable.item_id,
    movement_type: stockMovementsTable.movement_type,
    quantity: stockMovementsTable.quantity,
  }).from(stockMovementsTable);

  const movementMap = new Map<number, { in: number; out: number }>();
  for (const m of allMovements) {
    const entry = movementMap.get(m.item_id) ?? { in: 0, out: 0 };
    if (m.movement_type === "IN") entry.in += m.quantity;
    else entry.out += m.quantity;
    movementMap.set(m.item_id, entry);
  }

  return items.map(item => {
    const mv = movementMap.get(item.id) ?? { in: 0, out: 0 };
    const current_stock = item.opening_stock + mv.in - mv.out;
    let stock_status = "OK";
    if (current_stock <= 0) stock_status = "Out of Stock";
    else if (item.min_stock !== null && current_stock < item.min_stock) stock_status = "Low Stock";
    return { ...item, current_stock, stock_status };
  });
}

router.get("/current-stock", requireAuth, async (req, res) => {
  const { category, location, stock_status } = req.query as Record<string, string>;
  let items = await getAllItemsWithStock();

  if (category) items = items.filter(i => i.category === category);
  if (location) items = items.filter(i => i.location === location);
  if (stock_status) items = items.filter(i => i.stock_status === stock_status);

  return res.json(items);
});

router.get("/low-stock", requireAuth, async (req, res) => {
  const items = await getAllItemsWithStock();
  return res.json(items.filter(i => i.stock_status !== "OK"));
});

export default router;
