exports.up = async function (knex) {
  await knex.raw(`
    WITH inserted AS (
      INSERT INTO inventory_movements (
      company_id,
      warehouse_id,
      item_type,
      item_id,
      movement_type,
      quantity_delta,
      unit_cost,
      reference_type,
      reference_id,
      occurred_at,
      note,
      created_by,
      created_at
    )
    SELECT
      mp.company_id,
      w.id,
      'raw_material',
      mpi.raw_material_id,
      'in',
      SUM(mpi.quantity),
      CASE
        WHEN SUM(mpi.quantity) = 0 THEN NULL
        ELSE ROUND(SUM(mpi.total_amount) / SUM(mpi.quantity), 2)
      END,
      'material_purchase',
      mp.id::text,
      mp.purchased_at::timestamp,
      'Homashyo xaridi #' || mp.id,
      mp.created_by,
      NOW()
    FROM material_purchases mp
    JOIN material_purchase_items mpi ON mpi.purchase_id = mp.id
    JOIN warehouses w
      ON w.company_id = mp.company_id
      AND w.is_default = true
      AND w.is_active = true
    WHERE mp.is_deleted = false
      AND NOT EXISTS (
        SELECT 1
        FROM inventory_movements im
        WHERE im.company_id = mp.company_id
          AND im.reference_type = 'material_purchase'
          AND im.reference_id = mp.id::text
          AND im.item_type = 'raw_material'
          AND im.item_id = mpi.raw_material_id
      )
      GROUP BY
        mp.company_id,
        w.id,
        mp.id,
        mpi.raw_material_id,
        mp.purchased_at,
        mp.created_by
      RETURNING company_id, warehouse_id, item_type, item_id, quantity_delta
    )
    INSERT INTO inventory_balances (
      company_id,
      warehouse_id,
      item_type,
      item_id,
      quantity,
      minimum_quantity,
      updated_at
    )
    SELECT
      company_id,
      warehouse_id,
      item_type,
      item_id,
      SUM(quantity_delta),
      0,
      NOW()
    FROM inserted
    GROUP BY company_id, warehouse_id, item_type, item_id
    ON CONFLICT (company_id, warehouse_id, item_type, item_id)
    DO UPDATE SET
      quantity = inventory_balances.quantity + EXCLUDED.quantity,
      updated_at = NOW()
  `);
};

exports.down = async function (knex) {
  await knex("inventory_movements").where({ reference_type: "material_purchase" }).delete();
  await knex.raw(`
    UPDATE inventory_balances ib
    SET
      quantity = GREATEST(
        COALESCE((
          SELECT SUM(im.quantity_delta)
          FROM inventory_movements im
          WHERE im.company_id = ib.company_id
            AND im.warehouse_id = ib.warehouse_id
            AND im.item_type = ib.item_type
            AND im.item_id = ib.item_id
        ), 0),
        0
      ),
      updated_at = NOW()
  `);
};
