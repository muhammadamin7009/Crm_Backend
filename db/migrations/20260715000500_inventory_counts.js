const TENANT_SETTING = "NULLIF(current_setting('app.current_company_id', true), '')::integer";

const enableTenantIsolation = async (knex, tableName) => {
  await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [tableName]);
  await knex.raw(`ALTER TABLE ?? FORCE ROW LEVEL SECURITY`, [tableName]);
  await knex.raw(
    `CREATE POLICY tenant_isolation ON ?? USING (company_id = ${TENANT_SETTING}) WITH CHECK (company_id = ${TENANT_SETTING})`,
    [tableName],
  );
  await knex.raw("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ?? TO crm_tenant_user", [
    tableName,
  ]);
};

exports.up = async function (knex) {
  await knex.schema.alterTable("warehouses", (table) => {
    table.string("warehouse_type", 20).notNullable().defaultTo("mixed");
  });
  await knex.raw(
    "ALTER TABLE warehouses ADD CONSTRAINT warehouses_type_check CHECK (warehouse_type IN ('product', 'raw_material', 'mixed'))",
  );

  const companies = await knex("companies").select("id");
  for (const company of companies) {
    let productWarehouse = await knex("warehouses")
      .where({ company_id: company.id, code: "MAIN" })
      .first();

    if (productWarehouse) {
      await knex("warehouses").where({ id: productWarehouse.id }).update({
        name: "Tayyor mahsulot ombori",
        warehouse_type: "product",
        is_active: true,
        is_default: true,
      });
    } else {
      const currentDefault = await knex("warehouses")
        .where({ company_id: company.id, is_default: true, is_active: true })
        .first();
      if (currentDefault) {
        productWarehouse = currentDefault;
        await knex("warehouses").where({ id: currentDefault.id }).update({
          warehouse_type: "product",
        });
      } else {
        [productWarehouse] = await knex("warehouses")
          .insert({
            company_id: company.id,
            name: "Tayyor mahsulot ombori",
            code: "FINISHED",
            warehouse_type: "product",
            is_default: true,
            is_active: true,
          })
          .returning("*");
      }
    }

    let rawWarehouse = await knex("warehouses")
      .where({ company_id: company.id, code: "RAW" })
      .first();
    if (!rawWarehouse) {
      [rawWarehouse] = await knex("warehouses")
        .insert({
          company_id: company.id,
          name: "Homashyo ombori",
          code: "RAW",
          warehouse_type: "raw_material",
          is_default: false,
          is_active: true,
        })
        .returning("*");
    } else {
      await knex("warehouses").where({ id: rawWarehouse.id }).update({
        name: "Homashyo ombori",
        warehouse_type: "raw_material",
        is_active: true,
      });
    }

    const rawBalances = await knex("inventory_balances").where({
      company_id: company.id,
      warehouse_id: productWarehouse.id,
      item_type: "raw_material",
    });
    for (const balance of rawBalances) {
      const destination = await knex("inventory_balances")
        .where({
          company_id: company.id,
          warehouse_id: rawWarehouse.id,
          item_type: balance.item_type,
          item_id: balance.item_id,
        })
        .first();
      if (destination) {
        await knex("inventory_balances")
          .where({ id: destination.id })
          .update({
            quantity: Number(destination.quantity) + Number(balance.quantity),
            minimum_quantity: Math.max(
              Number(destination.minimum_quantity),
              Number(balance.minimum_quantity),
            ),
          });
        await knex("inventory_balances").where({ id: balance.id }).delete();
      } else {
        await knex("inventory_balances")
          .where({ id: balance.id })
          .update({ warehouse_id: rawWarehouse.id });
      }
    }
    await knex("inventory_movements")
      .where({
        company_id: company.id,
        warehouse_id: productWarehouse.id,
        item_type: "raw_material",
      })
      .update({ warehouse_id: rawWarehouse.id });
  }

  await knex.schema.createTable("inventory_counts", (table) => {
    table.bigIncrements("id");
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .defaultTo(knex.raw(TENANT_SETTING))
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");
    table
      .integer("warehouse_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("warehouses")
      .onDelete("RESTRICT");
    table.string("status", 20).notNullable().defaultTo("completed");
    table.integer("total_lines").notNullable().defaultTo(0);
    table.integer("variance_lines").notNullable().defaultTo(0);
    table.timestamp("counted_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("note").nullable();
    table.string("idempotency_key", 100).nullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "warehouse_id", "counted_at"]);
  });
  await knex.raw(
    "CREATE UNIQUE INDEX inventory_counts_idempotency_unique ON inventory_counts (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL",
  );

  await knex.schema.createTable("inventory_count_items", (table) => {
    table.bigIncrements("id");
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .defaultTo(knex.raw(TENANT_SETTING))
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");
    table
      .bigInteger("inventory_count_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_counts")
      .onDelete("CASCADE");
    table.string("item_type", 20).notNullable();
    table.integer("item_id").unsigned().notNullable();
    table.decimal("expected_quantity", 16, 3).notNullable();
    table.decimal("counted_quantity", 16, 3).notNullable();
    table.decimal("difference_quantity", 16, 3).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["company_id", "inventory_count_id", "item_type", "item_id"]);
  });
  await knex.raw(
    "ALTER TABLE inventory_count_items ADD CONSTRAINT inventory_count_items_type_check CHECK (item_type IN ('product', 'raw_material'))",
  );
  await knex.raw(
    "ALTER TABLE inventory_count_items ADD CONSTRAINT inventory_count_items_quantity_check CHECK (expected_quantity >= 0 AND counted_quantity >= 0)",
  );

  for (const tableName of ["inventory_counts", "inventory_count_items"]) {
    await enableTenantIsolation(knex, tableName);
  }
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE inventory_counts_id_seq TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE inventory_count_items_id_seq TO crm_tenant_user");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("inventory_count_items");
  await knex.schema.dropTableIfExists("inventory_counts");
  await knex.raw("ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_type_check");
  await knex.schema.alterTable("warehouses", (table) => {
    table.dropColumn("warehouse_type");
  });
};
