const setTenant = (knex, companyId) =>
  knex.raw("SELECT set_config('app.current_company_id', ?, true)", [String(companyId)]);

const mergeStandardWarehouses = async (knex, companyId, definition) => {
  const candidates = await knex("warehouses")
    .where({ company_id: companyId, is_active: true })
    .whereRaw("LOWER(BTRIM(name)) IN (?, ?)", definition.names)
    .select("*");

  if (!candidates.length) return;

  const ranked = [];
  for (const warehouse of candidates) {
    const balanceCount = await knex("inventory_balances")
      .where({ company_id: companyId, warehouse_id: warehouse.id })
      .count({ count: "id" })
      .first();
    ranked.push({ warehouse, lines: Number(balanceCount.count || 0) });
  }
  ranked.sort(
    (a, b) =>
      b.lines - a.lines ||
      Number(b.warehouse.is_default) - Number(a.warehouse.is_default) ||
      Number(a.warehouse.id) - Number(b.warehouse.id),
  );

  const keeper = ranked[0].warehouse;
  if (definition.type === "product") {
    await knex("warehouses")
      .where({ company_id: companyId, is_default: true })
      .update({ is_default: false });
  }

  for (const { warehouse: duplicate } of ranked.slice(1)) {
    const balances = await knex("inventory_balances").where({
      company_id: companyId,
      warehouse_id: duplicate.id,
    });
    for (const balance of balances) {
      const target = await knex("inventory_balances")
        .where({
          company_id: companyId,
          warehouse_id: keeper.id,
          item_type: balance.item_type,
          item_id: balance.item_id,
        })
        .first();
      if (target) {
        await knex("inventory_balances")
          .where({ id: target.id })
          .update({
            quantity: Number(target.quantity) + Number(balance.quantity),
            minimum_quantity: Math.max(
              Number(target.minimum_quantity),
              Number(balance.minimum_quantity),
            ),
            updated_at: knex.fn.now(),
          });
        await knex("inventory_balances").where({ id: balance.id }).delete();
      } else {
        await knex("inventory_balances")
          .where({ id: balance.id })
          .update({ warehouse_id: keeper.id, updated_at: knex.fn.now() });
      }
    }

    await knex("inventory_movements")
      .where({ company_id: companyId, warehouse_id: duplicate.id })
      .update({ warehouse_id: keeper.id });
    await knex("inventory_counts")
      .where({ company_id: companyId, warehouse_id: duplicate.id })
      .update({ warehouse_id: keeper.id });
    if (definition.type === "product") {
      await knex("client_sales")
        .where({ company_id: companyId, warehouse_id: duplicate.id })
        .update({ warehouse_id: keeper.id });
    }

    await knex("warehouses").where({ id: duplicate.id }).update({
      is_active: false,
      is_default: false,
      updated_at: knex.fn.now(),
    });
  }

  await knex("warehouses")
    .where({ id: keeper.id })
    .update({
      name: definition.canonicalName,
      warehouse_type: definition.type,
      is_active: true,
      is_default: definition.type === "product",
      updated_at: knex.fn.now(),
    });
};

exports.up = async function (knex) {
  const companies = await knex("companies").select("id");
  for (const company of companies) {
    await setTenant(knex, company.id);

    await mergeStandardWarehouses(knex, company.id, {
      type: "product",
      canonicalName: "Tayyor mahsulot ombori",
      names: ["tayyor mahsulot", "tayyor mahsulot ombori"],
    });
    await mergeStandardWarehouses(knex, company.id, {
      type: "raw_material",
      canonicalName: "Homashyo ombori",
      names: ["homashyo", "homashyo ombori"],
    });
  }

  await knex.raw("SELECT set_config('app.current_company_id', '', true)");
};

exports.down = async function () {
  // Birlashtirilgan qoldiq va tarixni xavfsiz tarzda qayta ajratib bo'lmaydi.
};
