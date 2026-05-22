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
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const monthlyIn = allMovements
    .filter(m => m.movement_type === "IN" && m.movement_date >= monthStart)
    .reduce((acc, m) => acc + m.quantity, 0);

  const monthlyOut = allMovements
    .filter(m => m.movement_type === "OUT" && m.movement_date >= monthStart)
    .reduce((acc, m) => acc + m.quantity, 0);

  const todayIn = allMovements
    .filter(m => m.movement_type === "IN" && m.movement_date === today)
    .reduce((acc, m) => acc + m.quantity, 0);

  const todayOut = allMovements
    .filter(m => m.movement_type === "OUT" && m.movement_date === today)
    .reduce((acc, m) => acc + m.quantity, 0);

  const totalLocations = new Set(items.map(i => i.location).filter(Boolean)).size;
  const totalCategories = new Set(items.map(i => i.category).filter(Boolean)).size;

  return res.json({
    total_items: items.length,
    total_stock,
    low_stock_count,
    out_of_stock_count,
    stock_in_this_month: monthlyIn,
    stock_out_this_month: monthlyOut,
    stock_in_today: todayIn,
    stock_out_today: todayOut,
    total_locations: totalLocations,
    total_categories: totalCategories,
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

router.get("/top-stock-out", requireAuth, async (req, res) => {
  const movements = await db.select({
    item_id: stockMovementsTable.item_id,
    item_code: itemsTable.item_code,
    item_name: itemsTable.item_name,
    category: itemsTable.category,
    quantity: stockMovementsTable.quantity,
  })
    .from(stockMovementsTable)
    .leftJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
    .where(eq(stockMovementsTable.movement_type, "OUT"));

  const totals = new Map<number, { item_id: number; item_code: string; item_name: string; category: string | null; total_out: number }>();
  for (const m of movements) {
    const existing = totals.get(m.item_id) ?? { item_id: m.item_id, item_code: m.item_code ?? "", item_name: m.item_name ?? "", category: m.category ?? null, total_out: 0 };
    existing.total_out += m.quantity;
    totals.set(m.item_id, existing);
  }

  const result = Array.from(totals.values())
    .sort((a, b) => b.total_out - a.total_out)
    .slice(0, 10);

  return res.json(result);
});

router.get("/monthly-trend", requireAuth, async (req, res) => {
  const movements = await db.select({
    movement_type: stockMovementsTable.movement_type,
    quantity: stockMovementsTable.quantity,
    movement_date: stockMovementsTable.movement_date,
  }).from(stockMovementsTable);

  // Build last 6 months labels
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const trendMap = new Map<string, { stock_in: number; stock_out: number }>();
  for (const m of months) trendMap.set(m, { stock_in: 0, stock_out: 0 });

  for (const m of movements) {
    const month = m.movement_date.slice(0, 7);
    if (!trendMap.has(month)) continue;
    const entry = trendMap.get(month)!;
    if (m.movement_type === "IN") entry.stock_in += m.quantity;
    else entry.stock_out += m.quantity;
  }

  const result = months.map(month => ({ month, ...trendMap.get(month)! }));
  return res.json(result);
});

export default router;
