const crypto = require("crypto");
const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const ITEM_TABLES = {
  product: { table: "products", label: "Mahsulot" },
  raw_material: { table: "raw_materials", label: "Homashyo" },
};

const number = (value) => Number(value || 0);
const nullable = (value) => (value === undefined || value === "" ? null : value);

const getWarehouse = async (query, id, { activeOnly = true } = {}) => {
  const builder = query("warehouses").where({ id: Number(id) });
  if (activeOnly) builder.andWhere({ is_active: true });
  const warehouse = await builder.first();
  if (!warehouse) throw new NotFoundError("Ombor topilmadi");
  return warehouse;
};

const getItem = async (query, itemType, itemId) => {
  const definition = ITEM_TABLES[itemType];
  if (!definition) throw new BadRequestError("Ombor elementi turi noto'g'ri");
  const item = await query(definition.table)
    .where({ id: Number(itemId), is_deleted: false })
    .select("id", "name", "unit")
    .first();
  if (!item) throw new NotFoundError(`${definition.label} topilmadi`);
  return item;
};

const itemSelect = (query) =>
  query
    .leftJoin("products as p", function joinProduct() {
      this.on("p.id", "=", "ib.item_id").andOnVal("ib.item_type", "=", "product");
    })
    .leftJoin("raw_materials as rm", function joinMaterial() {
      this.on("rm.id", "=", "ib.item_id").andOnVal("ib.item_type", "=", "raw_material");
    })
    .leftJoin("warehouses as w", "w.id", "ib.warehouse_id");

const movementItemSelect = (query) =>
  query
    .leftJoin("products as p", function joinProduct() {
      this.on("p.id", "=", "im.item_id").andOnVal("im.item_type", "=", "product");
    })
    .leftJoin("raw_materials as rm", function joinMaterial() {
      this.on("rm.id", "=", "im.item_id").andOnVal("im.item_type", "=", "raw_material");
    })
    .leftJoin("warehouses as w", "w.id", "im.warehouse_id")
    .leftJoin("users as u", "u.id", "im.created_by");

const formatStock = (row) => ({
  ...row,
  quantity: number(row.quantity),
  minimum_quantity: number(row.minimum_quantity),
  is_low: number(row.minimum_quantity) > 0 && number(row.quantity) <= number(row.minimum_quantity),
});

const formatMovement = (row) => ({
  ...row,
  quantity_delta: number(row.quantity_delta),
  unit_cost: row.unit_cost === null ? null : number(row.unit_cost),
});

const listWarehouses = async ({ include_inactive = false } = {}) => {
  const query = db("warehouses as w")
    .leftJoin("inventory_balances as ib", "ib.warehouse_id", "w.id")
    .groupBy("w.id")
    .select("w.*")
    .count({ stock_lines: "ib.id" })
    .orderBy("w.is_default", "desc")
    .orderBy("w.name");
  if (!(include_inactive === true || include_inactive === "true")) {
    query.where("w.is_active", true);
  }
  const rows = await query;
  return {
    warehouses: rows.map((row) => ({ ...row, stock_lines: Number(row.stock_lines || 0) })),
  };
};

const createWarehouse = async (body, actor) =>
  db.transaction(async (trx) => {
    const code = String(body.code).trim().toUpperCase();
    const duplicate = await trx("warehouses").where({ code }).first("id");
    if (duplicate) throw new BadRequestError("Bu ombor kodi band");

    const existing = await trx("warehouses").where({ is_active: true }).first("id");
    const isDefault = Boolean(body.is_default) || !existing;
    if (isDefault) await trx("warehouses").where({ is_default: true }).update({ is_default: false });

    const [warehouse] = await trx("warehouses")
      .insert({
        name: body.name.trim(),
        code,
        location: nullable(body.location),
        is_default: isDefault,
        created_by: actor.id,
      })
      .returning("*");
    return { warehouse };
  });

const updateWarehouse = async (id, body) =>
  db.transaction(async (trx) => {
    const warehouse = await getWarehouse(trx, id, { activeOnly: false });
    if (body.is_default === false && warehouse.is_default) {
      throw new BadRequestError("Asosiy omborni almashtirish uchun boshqa omborni asosiy qiling");
    }

    const patch = { updated_at: trx.fn.now() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.location !== undefined) patch.location = nullable(body.location);
    if (body.code !== undefined) {
      patch.code = String(body.code).trim().toUpperCase();
      const duplicate = await trx("warehouses")
        .where({ code: patch.code })
        .whereNot({ id: warehouse.id })
        .first("id");
      if (duplicate) throw new BadRequestError("Bu ombor kodi band");
    }
    if (body.is_default === true) {
      await trx("warehouses").where({ is_default: true }).whereNot({ id: warehouse.id }).update({
        is_default: false,
        updated_at: trx.fn.now(),
      });
      patch.is_default = true;
    }

    const [updated] = await trx("warehouses").where({ id: warehouse.id }).update(patch).returning("*");
    return { warehouse: updated };
  });

const archiveWarehouse = async (id) =>
  db.transaction(async (trx) => {
    const warehouse = await getWarehouse(trx, id);
    const nonEmpty = await trx("inventory_balances")
      .where({ warehouse_id: warehouse.id })
      .where("quantity", ">", 0)
      .first("id");
    if (nonEmpty) throw new BadRequestError("Qoldig'i bor omborni arxivlab bo'lmaydi");

    if (warehouse.is_default) {
      const replacement = await trx("warehouses")
        .where({ is_active: true })
        .whereNot({ id: warehouse.id })
        .orderBy("id")
        .first();
      if (!replacement) throw new BadRequestError("Yagona faol omborni arxivlab bo'lmaydi");
      await trx("warehouses").where({ id: replacement.id }).update({
        is_default: true,
        updated_at: trx.fn.now(),
      });
    }

    await trx("warehouses").where({ id: warehouse.id }).update({
      is_active: false,
      is_default: false,
      updated_at: trx.fn.now(),
    });
    return { message: "Ombor arxivlandi" };
  });

const listStock = async ({
  q = "",
  warehouse_id,
  item_type,
  low_only = false,
  limit = 50,
  offset = 0,
} = {}) => {
  const base = itemSelect(db("inventory_balances as ib"));
  if (warehouse_id) base.where("ib.warehouse_id", Number(warehouse_id));
  if (item_type) base.where("ib.item_type", item_type);
  if (q) {
    base.where((builder) =>
      builder
        .whereILike("p.name", `%${q}%`)
        .orWhereILike("rm.name", `%${q}%`)
        .orWhereILike("w.name", `%${q}%`),
    );
  }
  if (low_only === true || low_only === "true") {
    base.where("ib.minimum_quantity", ">", 0).whereRaw("ib.quantity <= ib.minimum_quantity");
  }

  const [rows, count] = await Promise.all([
    base
      .clone()
      .select(
        "ib.*",
        "w.name as warehouse_name",
        "w.code as warehouse_code",
        db.raw("COALESCE(p.name, rm.name) AS item_name"),
        db.raw("COALESCE(p.unit, rm.unit) AS unit"),
      )
      .orderBy("w.is_default", "desc")
      .orderByRaw("COALESCE(p.name, rm.name) ASC")
      .limit(Number(limit))
      .offset(Number(offset)),
    base.clone().clearSelect().clearOrder().countDistinct({ count: "ib.id" }).first(),
  ]);

  return {
    stock: rows.map(formatStock),
    pageInfo: { total: Number(count.count), limit: Number(limit), offset: Number(offset) },
  };
};

const listLowStock = (query = {}) => listStock({ ...query, low_only: true });

const listItems = async ({ q = "", item_type, limit = 200 } = {}) => {
  const load = async (type, table) => {
    if (item_type && item_type !== type) return [];
    const query = db(table).where({ is_deleted: false }).select("id", "name", "unit");
    if (q) query.andWhereILike("name", `%${q}%`);
    const rows = await query.orderBy("name").limit(Number(limit));
    return rows.map((row) => ({
      item_type: type,
      item_id: row.id,
      name: row.name,
      unit: row.unit,
    }));
  };
  const [products, materials] = await Promise.all([
    load("product", "products"),
    load("raw_material", "raw_materials"),
  ]);
  return { items: [...products, ...materials].slice(0, Number(limit)) };
};

const updateThreshold = async (id, minimumQuantity) => {
  const [row] = await db("inventory_balances")
    .where({ id: Number(id) })
    .update({ minimum_quantity: Number(minimumQuantity), updated_at: db.fn.now() })
    .returning("*");
  if (!row) throw new NotFoundError("Ombor qoldig'i topilmadi");
  return { stock: formatStock(row) };
};

const listMovements = async ({
  q = "",
  warehouse_id,
  item_type,
  movement_type,
  date_from,
  date_to,
  limit = 50,
  offset = 0,
} = {}) => {
  const base = movementItemSelect(db("inventory_movements as im"));
  if (warehouse_id) base.where("im.warehouse_id", Number(warehouse_id));
  if (item_type) base.where("im.item_type", item_type);
  if (movement_type) base.where("im.movement_type", movement_type);
  if (date_from) base.where("im.occurred_at", ">=", date_from);
  if (date_to) base.where("im.occurred_at", "<=", date_to);
  if (q) {
    base.where((builder) =>
      builder
        .whereILike("p.name", `%${q}%`)
        .orWhereILike("rm.name", `%${q}%`)
        .orWhereILike("w.name", `%${q}%`)
        .orWhereILike("im.note", `%${q}%`),
    );
  }

  const [rows, count] = await Promise.all([
    base
      .clone()
      .select(
        "im.*",
        "w.name as warehouse_name",
        "w.code as warehouse_code",
        "u.first_name",
        "u.last_name",
        "u.username",
        db.raw("COALESCE(p.name, rm.name) AS item_name"),
        db.raw("COALESCE(p.unit, rm.unit) AS unit"),
      )
      .orderBy("im.occurred_at", "desc")
      .orderBy("im.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    base.clone().clearSelect().clearOrder().countDistinct({ count: "im.id" }).first(),
  ]);

  return {
    inventory_movements: rows.map(formatMovement),
    pageInfo: { total: Number(count.count), limit: Number(limit), offset: Number(offset) },
  };
};

const ensureBalance = async (trx, warehouseId, itemType, itemId) => {
  await trx("inventory_balances")
    .insert({ warehouse_id: warehouseId, item_type: itemType, item_id: itemId })
    .onConflict(["company_id", "warehouse_id", "item_type", "item_id"])
    .ignore();
  return trx("inventory_balances")
    .where({ warehouse_id: warehouseId, item_type: itemType, item_id: itemId })
    .forUpdate()
    .first();
};

const addMovement = async (trx, body, actor, movementType, quantityDelta, extra = {}) => {
  const [movement] = await trx("inventory_movements")
    .insert({
      warehouse_id: Number(body.warehouse_id),
      item_type: body.item_type,
      item_id: Number(body.item_id),
      movement_type: movementType,
      quantity_delta: quantityDelta,
      unit_cost: nullable(body.unit_cost),
      reference_type: nullable(extra.reference_type ?? body.reference_type),
      reference_id: nullable(extra.reference_id ?? body.reference_id),
      idempotency_key: nullable(extra.idempotency_key ?? body.idempotency_key),
      occurred_at: body.occurred_at || trx.fn.now(),
      note: nullable(body.note),
      created_by: actor.id,
    })
    .returning("*");
  return formatMovement(movement);
};

const syncMaterialPurchase = async (trx, purchaseId, actor) => {
  const purchase = await trx("material_purchases")
    .where({ id: Number(purchaseId) })
    .forUpdate()
    .first();
  if (!purchase) throw new NotFoundError("Xarid topilmadi");

  let warehouse = await trx("warehouses")
    .where({ is_default: true, is_active: true })
    .first();
  if (!warehouse) warehouse = await trx("warehouses").where({ is_active: true }).orderBy("id").first();
  if (!warehouse) {
    [warehouse] = await trx("warehouses")
      .insert({
        name: "Asosiy ombor",
        code: "MAIN",
        is_default: true,
        is_active: true,
        created_by: actor?.id || purchase.created_by || null,
      })
      .returning("*");
  }

  const desiredRows = purchase.is_deleted
    ? []
    : await trx("material_purchase_items")
        .where({ purchase_id: purchase.id })
        .groupBy("raw_material_id")
        .select("raw_material_id")
        .sum({ quantity: "quantity" })
        .sum({ total_amount: "total_amount" });
  const trackedRows = await trx("inventory_movements")
    .where({
      reference_type: "material_purchase",
      reference_id: String(purchase.id),
      item_type: "raw_material",
    })
    .groupBy("item_id")
    .select("item_id")
    .sum({ quantity: "quantity_delta" });

  const desiredByItem = new Map(
    desiredRows.map((row) => [
      Number(row.raw_material_id),
      { quantity: number(row.quantity), totalAmount: number(row.total_amount) },
    ]),
  );
  const trackedByItem = new Map(
    trackedRows.map((row) => [Number(row.item_id), number(row.quantity)]),
  );
  const itemIds = [...new Set([...desiredByItem.keys(), ...trackedByItem.keys()])].sort(
    (a, b) => a - b,
  );
  const movements = [];

  for (const itemId of itemIds) {
    const desired = desiredByItem.get(itemId) || { quantity: 0, totalAmount: 0 };
    const delta = Number((desired.quantity - number(trackedByItem.get(itemId))).toFixed(3));
    if (Math.abs(delta) < 0.001) continue;

    const balance = await ensureBalance(trx, warehouse.id, "raw_material", itemId);
    const nextQuantity = number(balance.quantity) + delta;
    if (nextQuantity < 0) {
      throw new BadRequestError(
        "Xaridni o'zgartirish uchun ombordagi qoldiq yetarli emas. Avval sarf harakatlarini tekshiring",
      );
    }

    const movement = await addMovement(
      trx,
      {
        warehouse_id: warehouse.id,
        item_type: "raw_material",
        item_id: itemId,
        unit_cost:
          desired.quantity > 0 ? Number((desired.totalAmount / desired.quantity).toFixed(2)) : null,
        occurred_at: purchase.purchased_at,
        note: `Homashyo xaridi #${purchase.id}`,
      },
      { id: actor?.id || purchase.created_by || null },
      delta > 0 ? "in" : "out",
      delta,
      { reference_type: "material_purchase", reference_id: String(purchase.id) },
    );
    await trx("inventory_balances").where({ id: balance.id }).update({
      quantity: nextQuantity,
      updated_at: trx.fn.now(),
    });
    movements.push(movement);
  }

  return { warehouse, movements };
};

const createMovement = async (body, actor) =>
  db.transaction(async (trx) => {
    await getWarehouse(trx, body.warehouse_id);
    await getItem(trx, body.item_type, body.item_id);

    if (body.idempotency_key) {
      const existing = await trx("inventory_movements")
        .where({ idempotency_key: body.idempotency_key })
        .first();
      if (existing) {
        return { inventory_movement: formatMovement(existing), idempotent_replay: true };
      }
    }

    const inputQuantity = Number(body.quantity);
    if (body.movement_type !== "adjustment" && inputQuantity <= 0) {
      throw new BadRequestError("Kirim yoki chiqim miqdori musbat bo'lishi kerak");
    }
    const delta = body.movement_type === "out" ? -inputQuantity : inputQuantity;
    const balance = await ensureBalance(
      trx,
      Number(body.warehouse_id),
      body.item_type,
      Number(body.item_id),
    );
    const nextQuantity = number(balance.quantity) + delta;
    if (nextQuantity < 0) throw new BadRequestError("Omborda yetarli qoldiq yo'q");

    const movement = await addMovement(trx, body, actor, body.movement_type, delta);
    const [stock] = await trx("inventory_balances")
      .where({ id: balance.id })
      .update({ quantity: nextQuantity, updated_at: trx.fn.now() })
      .returning("*");
    return { inventory_movement: movement, stock: formatStock(stock) };
  });

const createTransfer = async (body, actor) =>
  db.transaction(async (trx) => {
    const fromId = Number(body.from_warehouse_id);
    const toId = Number(body.to_warehouse_id);
    await Promise.all([getWarehouse(trx, fromId), getWarehouse(trx, toId)]);
    await getItem(trx, body.item_type, body.item_id);

    if (body.idempotency_key) {
      const existing = await trx("inventory_movements")
        .where({ idempotency_key: `${body.idempotency_key}:out` })
        .first();
      if (existing) return { inventory_movement: formatMovement(existing), idempotent_replay: true };
    }

    for (const warehouseId of [fromId, toId].sort((a, b) => a - b)) {
      await ensureBalance(trx, warehouseId, body.item_type, Number(body.item_id));
    }
    const balances = await trx("inventory_balances")
      .where({ item_type: body.item_type, item_id: Number(body.item_id) })
      .whereIn("warehouse_id", [fromId, toId])
      .orderBy("warehouse_id")
      .forUpdate();
    const source = balances.find((row) => Number(row.warehouse_id) === fromId);
    const destination = balances.find((row) => Number(row.warehouse_id) === toId);
    const quantity = Number(body.quantity);
    if (number(source.quantity) < quantity) throw new BadRequestError("Ko'chirish uchun qoldiq yetarli emas");

    const transferId = crypto.randomUUID();
    const common = {
      item_type: body.item_type,
      item_id: body.item_id,
      occurred_at: body.occurred_at,
      note: body.note,
    };
    const out = await addMovement(
      trx,
      { ...common, warehouse_id: fromId },
      actor,
      "transfer_out",
      -quantity,
      {
        reference_type: "inventory_transfer",
        reference_id: transferId,
        idempotency_key: body.idempotency_key ? `${body.idempotency_key}:out` : null,
      },
    );
    const incoming = await addMovement(
      trx,
      { ...common, warehouse_id: toId },
      actor,
      "transfer_in",
      quantity,
      {
        reference_type: "inventory_transfer",
        reference_id: transferId,
        idempotency_key: body.idempotency_key ? `${body.idempotency_key}:in` : null,
      },
    );

    await trx("inventory_balances").where({ id: source.id }).update({
      quantity: number(source.quantity) - quantity,
      updated_at: trx.fn.now(),
    });
    await trx("inventory_balances").where({ id: destination.id }).update({
      quantity: number(destination.quantity) + quantity,
      updated_at: trx.fn.now(),
    });
    return { transfer_id: transferId, movements: [out, incoming] };
  });

module.exports = {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  listStock,
  listLowStock,
  listItems,
  updateThreshold,
  listMovements,
  createMovement,
  createTransfer,
  syncMaterialPurchase,
};
