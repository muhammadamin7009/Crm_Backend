const CURRENT_FEATURES = {
  plus: ["production_core"],
  pro: ["production_core", "client_accounting", "supplier_accounting", "finance"],
  business: [
    "production_core",
    "client_accounting",
    "supplier_accounting",
    "finance",
    "audit_logs",
  ],
  enterprise: [
    "production_core",
    "client_accounting",
    "supplier_accounting",
    "finance",
    "audit_logs",
  ],
};

const COHERENT_FEATURES = {
  plus: ["production_core", "client_accounting", "supplier_accounting"],
  pro: ["production_core", "client_accounting", "supplier_accounting", "finance"],
  business: [
    "production_core",
    "client_accounting",
    "supplier_accounting",
    "finance",
    "audit_logs",
  ],
  enterprise: [
    "production_core",
    "client_accounting",
    "supplier_accounting",
    "finance",
    "audit_logs",
  ],
};

async function updateFeatures(knex, plans) {
  for (const [code, features] of Object.entries(plans)) {
    await knex("subscription_plans")
      .where({ code })
      .update({ features: JSON.stringify(features) });
  }
}

exports.up = async (knex) => updateFeatures(knex, COHERENT_FEATURES);

exports.down = async (knex) => updateFeatures(knex, CURRENT_FEATURES);
