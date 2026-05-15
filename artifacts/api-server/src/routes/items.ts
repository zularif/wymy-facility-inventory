import { Router } from "express";
import { db, itemsTable, stockMovementsTable, auditLogTable, profilesTable } from "@workspace/db";
import { eq, ilike, and, sql, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getSessionUser } from "../middlewares/auth";
import bcrypt from "bcryptjs";

const router = Router();

function computeStockStatus(item: { current_stock: number; min_stock: number | null }) {
  if (item.current_stock <= 0) return "Out of Stock";
  if (item.min_stock !== null && item.current_stock < item.min_stock) return "Low Stock";
  return "OK";
}

async function getItemWithStock(id: number) {
  const items = await db.select().from(itemsTable).where(eq(itemsTable.id, id)).limit(1);
  if (!items.length) return null;
  const item = items[0];

  const result = await db
    .select({
      total_in: sql<string>`coalesce(sum(case when movement_type = 'IN' then quantity else 0 end), 0)`,
      total_out: sql<string>`coalesce(sum(case when movement_type = 'OUT' then quantity else 0 end), 0)`,
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.item_id, id));

  const totalIn = parseInt(result[0]?.total_in ?? "0");
  const totalOut = parseInt(result[0]?.total_out ?? "0");
  const current_stock = item.opening_stock + totalIn - totalOut;
  const stock_status = computeStockStatus({ current_stock, min_stock: item.min_stock });

  return { ...item, current_stock, stock_status };
}

router.get("/", requireAuth, async (req, res) => {
  const { search, category, location, status } = req.query as Record<string, string>;

  let items = await db.select().from(itemsTable).orderBy(asc(itemsTable.item_name));

  if (search) {
    items = items.filter(i =>
      i.item_code.toLowerCase().includes(search.toLowerCase()) ||
      i.item_name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (category) items = items.filter(i => i.category === category);
  if (location) items = items.filter(i => i.location === location);
  if (status) items = items.filter(i => i.status === status);

  const allMovements = await db
    .select({
      item_id: stockMovementsTable.item_id,
      movement_type: stockMovementsTable.movement_type,
      quantity: stockMovementsTable.quantity,
    })
    .from(stockMovementsTable);

  const movementMap = new Map<number, { in: number; out: number }>();
  for (const m of allMovements) {
    const entry = movementMap.get(m.item_id) ?? { in: 0, out: 0 };
    if (m.movement_type === "IN") entry.in += m.quantity;
    else entry.out += m.quantity;
    movementMap.set(m.item_id, entry);
  }

  const withStock = items.map(item => {
    const mv = movementMap.get(item.id) ?? { in: 0, out: 0 };
    const current_stock = item.opening_stock + mv.in - mv.out;
    const stock_status = computeStockStatus({ current_stock, min_stock: item.min_stock });
    return { ...item, current_stock, stock_status };
  });

  return res.json(withStock);
});

router.get("/categories", requireAuth, async (req, res) => {
  const items = await db.select({ category: itemsTable.category }).from(itemsTable);
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
  return res.json(cats);
});

router.get("/locations", requireAuth, async (req, res) => {
  const items = await db.select({ location: itemsTable.location }).from(itemsTable);
  const locs = [...new Set(items.map(i => i.location).filter(Boolean))].sort();
  return res.json(locs);
});

router.post("/import", requireAuth, async (req, res) => {
  const { items } = req.body as { items: Array<Record<string, unknown>> };
  const user = getSessionUser(req);

  let success_count = 0;
  const errors: Array<{ row: number; item_code: string; error: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const item_code = String(row.item_code ?? "").trim();

    if (!item_code) {
      errors.push({ row: i + 2, item_code: "", error: "Missing item_code" });
      continue;
    }

    const existing = await db.select().from(itemsTable).where(eq(itemsTable.item_code, item_code)).limit(1);
    if (existing.length) {
      errors.push({ row: i + 2, item_code, error: "Duplicate item_code" });
      continue;
    }

    try {
      await db.insert(itemsTable).values({
        item_code,
        item_name: String(row.item_name ?? ""),
        spec: row.spec ? String(row.spec) : null,
        category: row.category ? String(row.category) : null,
        unit: String(row.unit ?? "PCS"),
        location: row.location ? String(row.location) : null,
        min_stock: row.min_stock ? parseInt(String(row.min_stock)) : null,
        minimum_order: row.minimum_order ? parseInt(String(row.minimum_order)) : null,
        opening_stock: row.opening_stock ? parseInt(String(row.opening_stock)) : 0,
        photo_url: row.photo_url ? String(row.photo_url) : null,
        status: (row.status === "inactive") ? "inactive" : "active",
      });

      await db.insert(auditLogTable).values({
        user_id: String(user.id),
        action: "CREATE",
        table_name: "items",
        record_id: item_code,
        description: `Imported item ${item_code}`,
      });

      success_count++;
    } catch (e: unknown) {
      errors.push({ row: i + 2, item_code, error: (e as Error).message });
    }
  }

  return res.json({ success_count, error_count: errors.length, errors });
});

router.get("/by-code/:item_code", requireAuth, async (req, res) => {
  const { item_code } = req.params;
  const items = await db.select().from(itemsTable).where(eq(itemsTable.item_code, item_code)).limit(1);
  if (!items.length) return res.status(404).json({ error: "Item not found" });

  const withStock = await getItemWithStock(items[0].id);
  return res.json(withStock);
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const withStock = await getItemWithStock(id);
  if (!withStock) return res.status(404).json({ error: "Item not found" });
  return res.json(withStock);
});

router.post("/", requireAuth, async (req, res) => {
  const user = getSessionUser(req);
  const data = req.body;

  const existing = await db.select().from(itemsTable).where(eq(itemsTable.item_code, data.item_code)).limit(1);
  if (existing.length) {
    return res.status(400).json({ error: "item_code already exists" });
  }

  const [item] = await db.insert(itemsTable).values({
    item_code: data.item_code,
    item_name: data.item_name,
    spec: data.spec ?? null,
    category: data.category ?? null,
    unit: data.unit,
    location: data.location ?? null,
    min_stock: data.min_stock ?? null,
    minimum_order: data.minimum_order ?? null,
    opening_stock: data.opening_stock ?? 0,
    photo_url: data.photo_url ?? null,
    status: data.status ?? "active",
  }).returning();

  await db.insert(auditLogTable).values({
    user_id: String(user.id),
    action: "CREATE",
    table_name: "items",
    record_id: String(item.id),
    description: `Created item ${item.item_code} - ${item.item_name}`,
  });

  return res.status(201).json(item);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const user = getSessionUser(req);
  const data = req.body;

  const [item] = await db.update(itemsTable).set({
    ...data,
    updated_at: new Date(),
  }).where(eq(itemsTable.id, id)).returning();

  if (!item) return res.status(404).json({ error: "Item not found" });

  await db.insert(auditLogTable).values({
    user_id: String(user.id),
    action: "UPDATE",
    table_name: "items",
    record_id: String(id),
    description: `Updated item ${item.item_code}`,
  });

  return res.json(item);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const user = getSessionUser(req);

  const [item] = await db.update(itemsTable).set({ status: "inactive", updated_at: new Date() })
    .where(eq(itemsTable.id, id)).returning();

  if (!item) return res.status(404).json({ error: "Item not found" });

  await db.insert(auditLogTable).values({
    user_id: String(user.id),
    action: "DEACTIVATE",
    table_name: "items",
    record_id: String(id),
    description: `Deactivated item ${item.item_code}`,
  });

  return res.json(item);
});

export default router;
