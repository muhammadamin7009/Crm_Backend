exports.up = async function (knex) {
  await knex.schema.alterTable("client_sales", (table) => {
    table
      .integer("warehouse_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("warehouses")
      .onDelete("RESTRICT");
    table.timestamp("inventory_tracked_at", { useTz: true }).nullable();
    table.index(["company_id", "warehouse_id", "sold_at"], "client_sales_warehouse_idx");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("client_sales", (table) => {
    table.dropIndex(["company_id", "warehouse_id", "sold_at"], "client_sales_warehouse_idx");
    table.dropColumn("inventory_tracked_at");
    table.dropColumn("warehouse_id");
  });
};
