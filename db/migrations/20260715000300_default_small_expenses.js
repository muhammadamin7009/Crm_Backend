const DEFAULT_CATEGORY = "Mayda xarajatlar";
const DEFAULT_DESCRIPTION = "Korxonaning kundalik mayda va xo'jalik xarajatlari";

const setTenant = (knex, companyId) =>
  knex.raw("SELECT set_config('app.current_company_id', ?, true)", [String(companyId)]);

exports.up = async function (knex) {
  const companies = await knex("companies").select("id").orderBy("id");

  for (const company of companies) {
    await setTenant(knex, company.id);

    const exists = await knex("expense_categories")
      .where({ company_id: company.id })
      .whereRaw("lower(name) = lower(?)", [DEFAULT_CATEGORY])
      .first("id");

    if (!exists) {
      await knex("expense_categories").insert({
        company_id: company.id,
        name: DEFAULT_CATEGORY,
        description: DEFAULT_DESCRIPTION,
        is_active: true,
        is_deleted: false,
      });
    }
  }

  await knex.raw("SELECT set_config('app.current_company_id', '', true)");
};

exports.down = async function (knex) {
  const companies = await knex("companies").select("id").orderBy("id");

  for (const company of companies) {
    await setTenant(knex, company.id);
    await knex("expense_categories as ec")
      .where("ec.company_id", company.id)
      .where("ec.name", DEFAULT_CATEGORY)
      .whereNotExists(knex("expenses as e").select(1).whereRaw("e.category_id = ec.id"))
      .del();
  }

  await knex.raw("SELECT set_config('app.current_company_id', '', true)");
};
