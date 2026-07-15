const db = require("../db");
const { NotFoundError, ForbiddenError } = require("./errors");

const tenantContext = async (req, res, next) => {
  try {
    const company = await db
      .root("companies as c")
      .leftJoin("company_subscriptions as cs", "cs.company_id", "c.id")
      .leftJoin("subscription_plans as sp", "sp.id", "cs.plan_id")
      .where({ "c.slug": req.params.companySlug })
      .select(
        "c.*",
        "cs.status as subscription_status",
        "cs.ends_at as subscription_ends_at",
        "sp.code as plan_code",
        "sp.name as plan_name",
        "sp.max_users as plan_max_users",
        "sp.max_workers as plan_max_workers",
        "sp.max_clients as plan_max_clients",
        "sp.max_admins as plan_max_admins",
        "sp.storage_mb as plan_storage_mb",
        "sp.features as plan_features",
      )
      .first();

    if (!company) throw new NotFoundError("Korxona topilmadi");
    if (company.status !== "active") {
      throw new ForbiddenError("Korxona tizimi vaqtincha faol emas");
    }
    if (["overdue", "suspended"].includes(company.subscription_status)) {
      throw new ForbiddenError("Korxona obunasi faol emas");
    }
    if (
      company.subscription_ends_at &&
      new Date(company.subscription_ends_at) < new Date(new Date().toISOString().slice(0, 10))
    ) {
      throw new ForbiddenError("Korxona obuna muddati tugagan");
    }

    req.company = company;

    await db.root.transaction(async (trx) => {
      await trx.raw("SET LOCAL ROLE crm_tenant_user");
      await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [String(company.id)]);

      await new Promise((resolve, reject) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        res.once("finish", done);
        res.once("close", done);

        db.runWithDatabase(trx, () => {
          try {
            next();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = tenantContext;
