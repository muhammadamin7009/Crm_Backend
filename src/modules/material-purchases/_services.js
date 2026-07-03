const db = require("../../db");
const { BadRequestError, NotFoundError } = require("../../shared/errors");

const clean = (value) => value || null;
const getSupplier = async (id) => {
  const row = await db("suppliers").where({ id, is_deleted: false }).first();
  if (!row) throw new NotFoundError("Ta'minotchi topilmadi");
  return row;
};
const getMaterial = async (id) => {
  const row = await db("raw_materials").where({ id, is_deleted: false }).first();
  if (!row) throw new NotFoundError("Homashyo topilmadi");
  return row;
};

const supplierBalance = async ({ supplier_id, date_from, date_to }) => {
  const purchases = db("material_purchases").where({ is_deleted: false });
  const payments = db("supplier_payments").where({ is_deleted: false });
  const suppliers = db("suppliers").where({ is_deleted: false });
  if (supplier_id) {
    await getSupplier(Number(supplier_id));
    purchases.andWhere("supplier_id", Number(supplier_id));
    payments.andWhere("supplier_id", Number(supplier_id));
    suppliers.andWhere("id", Number(supplier_id));
  }
  if (date_from) {
    purchases.andWhere("purchased_at", ">=", date_from);
    payments.andWhere("paid_at", ">=", date_from);
  }
  if (date_to) {
    purchases.andWhere("purchased_at", "<=", date_to);
    payments.andWhere("paid_at", "<=", date_to);
  }
  const [purchase, payment, opening] = await Promise.all([
    purchases.sum({ purchased: "subtotal" }).sum({ paid_at_purchase: "paid_amount" }).first(),
    payments.sum({ later_paid: "amount" }).first(),
    suppliers.sum({ opening_balance: "opening_balance" }).first(),
  ]);
  const totalPurchase = Number(purchase.purchased || 0);
  const totalPaid = Number(purchase.paid_at_purchase || 0) + Number(payment.later_paid || 0);
  const openingBalance = date_from || date_to ? 0 : Number(opening.opening_balance || 0);
  return {
    opening_balance: openingBalance,
    total_purchase: totalPurchase,
    total_paid: totalPaid,
    debt_amount: openingBalance + totalPurchase - totalPaid,
  };
};

const listSuppliers = async ({ q = "", limit = 100, offset = 0 }) => {
  const query = db("suppliers").where({ is_deleted: false });
  if (q) query.andWhere((qb) => qb.whereILike("name", `%${q}%`).orWhereILike("phone", `%${q}%`));
  const [rows, count] = await Promise.all([
    query.clone().orderBy("name").limit(Number(limit)).offset(Number(offset)),
    query.clone().count({ count: "id" }).first(),
  ]);
  return {
    suppliers: rows,
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};
const createSupplier = async (body) => ({
  supplier: (
    await db("suppliers")
      .insert({
        name: body.name,
        phone: clean(body.phone),
        address: clean(body.address),
        opening_balance: Number(body.opening_balance || 0),
        note: clean(body.note),
      })
      .returning("*")
  )[0],
});
const updateSupplier = async (body, id) => {
  await getSupplier(id);
  const [row] = await db("suppliers")
    .where({ id })
    .update({
      ...body,
      phone: clean(body.phone),
      address: clean(body.address),
      note: clean(body.note),
      updated_at: db.fn.now(),
    })
    .returning("*");
  return { supplier: row };
};
const deleteSupplier = async (id) => {
  await getSupplier(id);
  const [purchase, payment] = await Promise.all([
    db("material_purchases").where({ supplier_id: id, is_deleted: false }).first(),
    db("supplier_payments").where({ supplier_id: id, is_deleted: false }).first(),
  ]);
  if (purchase || payment)
    throw new BadRequestError("Ta'minotchida xarid yoki to'lov tarixi bor, o'chirib bo'lmaydi");
  await db("suppliers").where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  return { message: "Ta'minotchi o'chirildi" };
};

const listMaterials = async ({ q = "", limit = 100, offset = 0 }) => {
  const query = db("raw_materials").where({ is_deleted: false });
  if (q) query.andWhereILike("name", `%${q}%`);
  const [rows, count] = await Promise.all([
    query.clone().orderBy("name").limit(Number(limit)).offset(Number(offset)),
    query.clone().count({ count: "id" }).first(),
  ]);
  return {
    raw_materials: rows,
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};
const createMaterial = async (body) => ({
  raw_material: (
    await db("raw_materials")
      .insert({
        name: body.name,
        unit: body.unit || "dona",
        note: clean(body.note),
      })
      .returning("*")
  )[0],
});
const updateMaterial = async (body, id) => {
  await getMaterial(id);
  const [row] = await db("raw_materials")
    .where({ id })
    .update({ ...body, note: clean(body.note), updated_at: db.fn.now() })
    .returning("*");
  return { raw_material: row };
};
const deleteMaterial = async (id) => {
  await getMaterial(id);
  const used = await db("material_purchase_items").where({ raw_material_id: id }).first();
  if (used) throw new BadRequestError("Homashyoda xarid tarixi bor, o'chirib bo'lmaydi");
  await db("raw_materials").where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  return { message: "Homashyo o'chirildi" };
};

const formatPurchase = async (id, trx = db) => {
  const purchase = await trx("material_purchases as mp")
    .join("suppliers as s", "s.id", "mp.supplier_id")
    .where({ "mp.id": id, "mp.is_deleted": false })
    .select("mp.*", "s.name as supplier_name")
    .first();
  if (!purchase) throw new NotFoundError("Xarid topilmadi");
  purchase.items = await trx("material_purchase_items as mpi")
    .join("raw_materials as rm", "rm.id", "mpi.raw_material_id")
    .where("mpi.purchase_id", id)
    .select("mpi.*", "rm.name as material_name", "rm.unit");
  return purchase;
};

const calculateItems = async (items) => {
  const rows = [];
  for (const item of items) {
    await getMaterial(Number(item.raw_material_id));
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    rows.push({
      raw_material_id: Number(item.raw_material_id),
      quantity,
      unit_price: unitPrice,
      total_amount: Number((quantity * unitPrice).toFixed(2)),
    });
  }
  return rows;
};

const createPurchase = async (body, actor) => {
  await getSupplier(Number(body.supplier_id));
  const previous = await supplierBalance({ supplier_id: body.supplier_id });
  const items = await calculateItems(body.items);
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const paid = Number(body.paid_amount || 0);
  if (paid > previous.debt_amount + subtotal)
    throw new BadRequestError("Berilgan summa jami qarzdan oshmasin");
  return db.transaction(async (trx) => {
    const [purchase] = await trx("material_purchases")
      .insert({
        supplier_id: Number(body.supplier_id),
        purchased_at: body.purchased_at || trx.fn.now(),
        subtotal,
        paid_amount: paid,
        debt_amount: subtotal - paid,
        note: clean(body.note),
        created_by: actor.id,
      })
      .returning("id");
    const purchaseId = purchase.id || purchase;
    await trx("material_purchase_items").insert(
      items.map((item) => ({ ...item, purchase_id: purchaseId })),
    );
    return {
      material_purchase: await formatPurchase(purchaseId, trx),
      previous_debt: previous.debt_amount,
      current_debt: previous.debt_amount + subtotal - paid,
    };
  });
};

const updatePurchase = async (body, id) => {
  const existing = await formatPurchase(id);
  const supplierId =
    body.supplier_id !== undefined ? Number(body.supplier_id) : Number(existing.supplier_id);
  await getSupplier(supplierId);
  const items = body.items
    ? await calculateItems(body.items)
    : existing.items.map(({ raw_material_id, quantity, unit_price, total_amount }) => ({
        raw_material_id,
        quantity: Number(quantity),
        unit_price: Number(unit_price),
        total_amount: Number(total_amount),
      }));
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const paid =
    body.paid_amount !== undefined ? Number(body.paid_amount) : Number(existing.paid_amount);
  return db.transaction(async (trx) => {
    await trx("material_purchases")
      .where({ id })
      .update({
        supplier_id: supplierId,
        purchased_at: body.purchased_at || existing.purchased_at,
        subtotal,
        paid_amount: paid,
        debt_amount: subtotal - paid,
        note: body.note !== undefined ? clean(body.note) : existing.note,
        updated_at: trx.fn.now(),
      });
    if (body.items) {
      await trx("material_purchase_items").where({ purchase_id: id }).del();
      await trx("material_purchase_items").insert(
        items.map((item) => ({ ...item, purchase_id: id })),
      );
    }
    return { material_purchase: await formatPurchase(id, trx) };
  });
};
const deletePurchase = async (id) => {
  await formatPurchase(id);
  await db("material_purchases")
    .where({ id })
    .update({ is_deleted: true, updated_at: db.fn.now() });
  return { message: "Xarid o'chirildi" };
};

const listPurchases = async ({
  q = "",
  supplier_id,
  date_from,
  date_to,
  limit = 20,
  offset = 0,
  sort_order = "desc",
}) => {
  const query = db("material_purchases as mp")
    .join("suppliers as s", "s.id", "mp.supplier_id")
    .where("mp.is_deleted", false);
  if (q)
    query.andWhere((qb) => qb.whereILike("s.name", `%${q}%`).orWhereILike("mp.note", `%${q}%`));
  if (supplier_id) query.andWhere("mp.supplier_id", Number(supplier_id));
  if (date_from) query.andWhere("mp.purchased_at", ">=", date_from);
  if (date_to) query.andWhere("mp.purchased_at", "<=", date_to);
  const [rows, count, totals] = await Promise.all([
    query
      .clone()
      .select("mp.*", "s.name as supplier_name")
      .orderBy("mp.purchased_at", sort_order)
      .orderBy("mp.id", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().clearSelect().countDistinct({ count: "mp.id" }).first(),
    query
      .clone()
      .clearSelect()
      .sum({ total_purchase: "mp.subtotal" })
      .sum({ paid_at_purchase: "mp.paid_amount" })
      .first(),
  ]);
  for (const row of rows)
    row.items = await db("material_purchase_items as mpi")
      .join("raw_materials as rm", "rm.id", "mpi.raw_material_id")
      .where("mpi.purchase_id", row.id)
      .select("mpi.*", "rm.name as material_name", "rm.unit");
  return {
    material_purchases: rows,
    totals: {
      total_purchase: Number(totals.total_purchase || 0),
      paid_at_purchase: Number(totals.paid_at_purchase || 0),
    },
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};

const createSupplierPayment = async (body, actor) => {
  await getSupplier(Number(body.supplier_id));
  const balance = await supplierBalance({ supplier_id: body.supplier_id });
  if (Number(body.amount) > balance.debt_amount)
    throw new BadRequestError(`To'lov qarzdan oshmasin. Qarz: ${balance.debt_amount}`);
  const [row] = await db("supplier_payments")
    .insert({
      supplier_id: Number(body.supplier_id),
      amount: Number(body.amount),
      paid_at: body.paid_at || db.fn.now(),
      note: clean(body.note),
      created_by: actor.id,
    })
    .returning("*");
  return { supplier_payment: row };
};
const listSupplierPayments = async ({
  supplier_id,
  date_from,
  date_to,
  limit = 100,
  offset = 0,
}) => {
  const query = db("supplier_payments as sp")
    .join("suppliers as s", "s.id", "sp.supplier_id")
    .where("sp.is_deleted", false);
  if (supplier_id) query.andWhere("sp.supplier_id", Number(supplier_id));
  if (date_from) query.andWhere("sp.paid_at", ">=", date_from);
  if (date_to) query.andWhere("sp.paid_at", "<=", date_to);
  const [rows, count] = await Promise.all([
    query
      .clone()
      .select("sp.*", "s.name as supplier_name")
      .orderBy("sp.paid_at", "desc")
      .limit(Number(limit))
      .offset(Number(offset)),
    query.clone().clearSelect().count({ count: "sp.id" }).first(),
  ]);
  return {
    supplier_payments: rows,
    pageInfo: {
      total: Number(count.count),
      limit: Number(limit),
      offset: Number(offset),
    },
  };
};

module.exports = {
  supplierBalance,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createPurchase,
  updatePurchase,
  deletePurchase,
  listPurchases,
  createSupplierPayment,
  listSupplierPayments,
};
