import { Router } from "express";
import { db, itemsTable, stockMovementsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const items = await db.select().from(itemsTable).where(eq(itemsTable.status, "active"));

  const allMovements = await db.select({
    item_id: stockMovementsTable.item_id,
    movement_type: stockMovementsTable.movement_type,
    quantity: stockMovementsTable.quantity,
    movement_date: stockMovementsTable.movement_date,
  }).from(stockMovementsTable);

  const movementMap = new Map<number, { in: number; out: number }>();
  for (const m of allMovements) {
    const entry = movementMap.get(m.item_id) ?? { in: 0, out: 0 };
    if (m.movement_type === "IN") entry.in += m.quantity;
    else entry.out += m.quantity;
    movementMap.set(m.item_id, entry);
  }

  let total_stock = 0;
  let low_stock_count = 0;
  let out_of_stock_count = 0;

  for (const item of items) {
    const mv = movementMap.get(item.id) ?? { in: 0, out: 0 };
    const current_stock = item.opening_stock + mv.in - mv.out;
    total_stock += Math.max(current_stock, 0);
    if (current_stock <= 0) out_of_stock_count++;
    else if (item.min_stock !== null && current_stock < item.min_stock) low_stock_count++;
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const monthlyIn = allMovements
    .filter(m => m.movement_type === "IN" && m.movement_date >= monthStart)
    .reduce((acc, m) => acc + m.quantity, 0);

  const monthlyOut = allMovements
    .filter(m => m.movement_type === "OUT" && m.movement_date >= monthStart)
    .reduce((acc, m) => acc + m.quantity, 0);

  return res.json({
    total_items: items.length,
    total_stock,
    low_stock_count,
    out_of_stock_count,
    stock_in_this_month: monthlyIn,
    stock_out_this_month: monthlyOut,
  });
});

router.get("/recent-movements", requireAuth, async (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "10");

  const movements = await db
    .select({
      id: stockMovementsTable.id,
      item_id: stockMovementsTable.item_id,
      item_code: itemsTable.item_code,
      item_name: itemsTable.item_name,
      movement_type: stockMovementsTable.movement_type,
      quantity: stockMovementsTable.quantity,
      movement_date: stockMovementsTable.movement_date,
      reference_no: stockMovementsTable.reference_no,
      supplier: stockMovementsTable.supplier,
      department: stockMovementsTable.department,
      requested_by: stockMovementsTable.requested_by,
      issued_by: stockMovementsTable.issued_by,
      purpose: stockMovementsTable.purpose,
      remarks: stockMovementsTable.remarks,
      created_by: stockMovementsTable.created_by,
      created_at: stockMovementsTable.created_at,
    })
    .from(stockMovementsTable)
    .leftJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
    .orderBy(desc(stockMovementsTable.created_at))
    .limit(limit);

  return res.json(movements);
});

router.get("/low-stock", requireAuth, async (req, res) => {
  const items = await db.select().from(itemsTable).where(eq(itemsTable.status, "active"));

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

  const lowStock = [];
  for (const item of items) {
    const mv = movementMap.get(item.id) ?? { in: 0, out: 0 };
    const current_stock = item.opening_stock + mv.in - mv.out;
    let stock_status = "OK";
    if (current_stock <= 0) stock_status = "Out of Stock";
    else if (item.min_stock !== null && current_stock < item.min_stock) stock_status = "Low Stock";

    if (stock_status !== "OK") {
      lowStock.push({ ...item, current_stock, stock_status });
    }
  }

  return res.json(lowStock);
});

export default router;
