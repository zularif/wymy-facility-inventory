import { Router } from "express";
import { db, stockMovementsTable, itemsTable, auditLogTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, getSessionUser } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { item_id, movement_type, date_from, date_to, category, location, limit, offset } = req.query as Record<string, string>;

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
      category: itemsTable.category,
      location: itemsTable.location,
    })
    .from(stockMovementsTable)
    .leftJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
    .orderBy(desc(stockMovementsTable.created_at));

  let filtered = movements;

  if (item_id) filtered = filtered.filter(m => m.item_id === parseInt(item_id));
  if (movement_type) filtered = filtered.filter(m => m.movement_type === movement_type);
  if (date_from) filtered = filtered.filter(m => m.movement_date >= date_from);
  if (date_to) filtered = filtered.filter(m => m.movement_date <= date_to);
  if (category) filtered = filtered.filter(m => m.category === category);
  if (location) filtered = filtered.filter(m => m.location === location);

  const off = offset ? parseInt(offset) : 0;
  const lim = limit ? parseInt(limit) : filtered.length;
  filtered = filtered.slice(off, off + lim);

  return res.json(filtered);
});

router.post("/", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  const data = req.body;

  const items = await db.select().from(itemsTable).where(eq(itemsTable.id, data.item_id)).limit(1);
  if (!items.length) return res.status(400).json({ error: "Item not found" });

  if (data.movement_type === "OUT") {
    const result = await db
      .select({
        total_in: sql<string>`coalesce(sum(case when movement_type = 'IN' then quantity else 0 end), 0)`,
        total_out: sql<string>`coalesce(sum(case when movement_type = 'OUT' then quantity else 0 end), 0)`,
      })
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.item_id, data.item_id));

    const item = items[0];
    const totalIn = parseInt(result[0]?.total_in ?? "0");
    const totalOut = parseInt(result[0]?.total_out ?? "0");
    const current_stock = item.opening_stock + totalIn - totalOut;

    if (data.quantity > current_stock) {
      return res.status(400).json({ error: `Insufficient stock. Current: ${current_stock}, Requested: ${data.quantity}` });
    }
  }

  const [movement] = await db.insert(stockMovementsTable).values({
    item_id: data.item_id,
    movement_type: data.movement_type,
    quantity: data.quantity,
    movement_date: data.movement_date,
    reference_no: data.reference_no ?? null,
    supplier: data.supplier ?? null,
    department: data.department ?? null,
    requested_by: data.requested_by ?? null,
    issued_by: data.issued_by ?? null,
    purpose: data.purpose ?? null,
    remarks: data.remarks ?? null,
    created_by: user.email ?? String(user.id),
  }).returning();

  await db.insert(auditLogTable).values({
    user_id: String(user.id),
    action: data.movement_type === "IN" ? "STOCK_IN" : "STOCK_OUT",
    table_name: "stock_movements",
    record_id: String(movement.id),
    description: `${data.movement_type} ${data.quantity} units of item ${items[0].item_code}`,
  });

  return res.status(201).json({ ...movement, item_code: items[0].item_code, item_name: items[0].item_name });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
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
    .where(eq(stockMovementsTable.id, id))
    .limit(1);

  if (!movements.length) return res.status(404).json({ error: "Movement not found" });
  return res.json(movements[0]);
});

export default router;
