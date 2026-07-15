const DEFAULT_CATEGORY = "Mayda xarajatlar";

exports.up = async function (knex) {
  await knex.raw(
    `
      INSERT INTO expense_categories (company_id, name, description, is_active, is_deleted)
      SELECT c.id, ?, ?, true, false
      FROM companies c
      WHERE NOT EXISTS (
        SELECT 1
        FROM expense_categories ec
        WHERE ec.company_id = c.id AND lower(ec.name) = lower(?)
      )
    `,
    [
      DEFAULT_CATEGORY,
      "Korxonaning kundalik mayda va xo'jalik xarajatlari",
      DEFAULT_CATEGORY,
    ],
  );
};

exports.down = async function (knex) {
  await knex("expense_categories as ec")
    .where("ec.name", DEFAULT_CATEGORY)
    .whereNotExists(knex("expenses as e").select(1).whereRaw("e.category_id = ec.id"))
    .del();
};
