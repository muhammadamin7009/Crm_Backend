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
  await knex.schema.createTable("warehouses", (table) => {
    table.increments("id");
    table
      .integer("company_id")
      .unsigned()
      .notNullable()
      .defaultTo(knex.raw(TENANT_SETTING))
      .references("id")
      .inTable("companies")
      .onDelete("CASCADE");
    table.string("name", 120).notNullable();
    table.string("code", 40).notNullable();
    table.string("location", 255).nullable();
    table.boolean("is_default").notNullable().defaultTo(false);
    table.boolean("is_active").notNullable().defaultTo(true);
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamps(true, true);
    table.unique(["company_id", "code"]);
    table.index(["company_id", "is_active"]);
  });

  await knex.raw(
    "CREATE UNIQUE INDEX warehouses_one_default_per_company ON warehouses (company_id) WHERE is_default = true AND is_active = true",
  );

  await knex.schema.createTable("inventory_balances", (table) => {
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
    table.string("item_type", 20).notNullable();
    table.integer("item_id").unsigned().notNullable();
    table.decimal("quantity", 16, 3).notNullable().defaultTo(0);
    table.decimal("minimum_quantity", 16, 3).notNullable().defaultTo(0);
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["company_id", "warehouse_id", "item_type", "item_id"]);
    table.index(["company_id", "item_type", "item_id"]);
  });

  await knex.raw(
    "ALTER TABLE inventory_balances ADD CONSTRAINT inventory_balances_item_type_check CHECK (item_type IN ('product', 'raw_material'))",
  );
  await knex.raw(
    "ALTER TABLE inventory_balances ADD CONSTRAINT inventory_balances_quantity_check CHECK (quantity >= 0)",
  );
  await knex.raw(
    "ALTER TABLE inventory_balances ADD CONSTRAINT inventory_balances_minimum_check CHECK (minimum_quantity >= 0)",
  );

  await knex.schema.createTable("inventory_movements", (table) => {
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
    table.string("item_type", 20).notNullable();
    table.integer("item_id").unsigned().notNullable();
    table.string("movement_type", 24).notNullable();
    table.decimal("quantity_delta", 16, 3).notNullable();
    table.decimal("unit_cost", 16, 2).nullable();
    table.string("reference_type", 40).nullable();
    table.string("reference_id", 80).nullable();
    table.string("idempotency_key", 100).nullable();
    table.timestamp("occurred_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("note").nullable();
    table
      .integer("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["company_id", "warehouse_id", "occurred_at"]);
    table.index(["company_id", "item_type", "item_id", "occurred_at"]);
  });

  await knex.raw(
    "ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_item_type_check CHECK (item_type IN ('product', 'raw_material'))",
  );
  await knex.raw(
    "ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check CHECK (movement_type IN ('opening', 'in', 'out', 'adjustment', 'transfer_in', 'transfer_out'))",
  );
  await knex.raw(
    "ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_quantity_check CHECK (quantity_delta <> 0)",
  );
  await knex.raw(
    "CREATE UNIQUE INDEX inventory_movements_idempotency_unique ON inventory_movements (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL",
  );

  const companies = await knex("companies").select("id");
  if (companies.length) {
    await knex("warehouses").insert(
      companies.map(({ id }) => ({
        company_id: id,
        name: "Asosiy ombor",
        code: "MAIN",
        is_default: true,
        is_active: true,
      })),
    );
  }

  for (const tableName of ["warehouses", "inventory_balances", "inventory_movements"]) {
    await enableTenantIsolation(knex, tableName);
  }

  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE warehouses_id_seq TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE inventory_balances_id_seq TO crm_tenant_user");
  await knex.raw("GRANT USAGE, SELECT ON SEQUENCE inventory_movements_id_seq TO crm_tenant_user");

  const permissionRows = [
    {
      key: "inventory.view",
      label: "Ombor qoldig'ini ko'rish",
      group: "Ombor",
      description: "Omborlar, qoldiq va harakatlar tarixini ko'rish.",
      sort_order: 21,
    },
    {
      key: "inventory.manage",
      label: "Omborni boshqarish",
      group: "Ombor",
      description: "Ombor, kirim, chiqim, ko'chirish va minimal qoldiqni boshqarish.",
      sort_order: 22,
    },
  ];

  await knex("permission_catalog").insert(permissionRows).onConflict("key").merge();

  const admins = await knex("users")
    .where({ role: "admin", is_deleted: false })
    .select("id", "company_id");
  const grants = admins.flatMap((admin) =>
    permissionRows.map((permission) => ({
      company_id: admin.company_id,
      user_id: admin.id,
      permission_key: permission.key,
      allowed: true,
    })),
  );
  if (grants.length) {
    await knex("user_permissions")
      .insert(grants)
      .onConflict(["company_id", "user_id", "permission_key"])
      .merge({ allowed: true });
  }
};

exports.down = async function (knex) {
  await knex("user_permissions")
    .whereIn("permission_key", ["inventory.view", "inventory.manage"])
    .delete();
  await knex("permission_catalog")
    .whereIn("key", ["inventory.view", "inventory.manage"])
    .delete();
  await knex.schema.dropTableIfExists("inventory_movements");
  await knex.schema.dropTableIfExists("inventory_balances");
  await knex.schema.dropTableIfExists("warehouses");
};
