const db = require("../db");
const { NotFoundError, ForbiddenError } = require("./errors");

const SUBSCRIPTION_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const daysAfterSubscriptionEnd = (endsAt) => {
  if (!endsAt) return null;
  return Math.floor((utcDay() - utcDay(endsAt)) / DAY_MS);
};

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
    if (company.subscription_status === "suspended") {
      throw new ForbiddenError("Korxona obunasi faol emas");
    }
    if (company.subscription_status === "overdue" && !company.subscription_ends_at) {
      throw new ForbiddenError("Korxona obunasi faol emas");
    }

    const expiredDays = daysAfterSubscriptionEnd(company.subscription_ends_at);
    if (expiredDays !== null && expiredDays > SUBSCRIPTION_GRACE_DAYS) {
      await db.root.transaction(async (trx) => {
        await trx("company_subscriptions").where({ company_id: company.id }).update({
          status: "suspended",
          updated_at: trx.fn.now(),
        });
        await trx("companies").where({ id: company.id }).update({
          status: "suspended",
          updated_at: trx.fn.now(),
        });
      });
      throw new ForbiddenError("Korxona obunasi 7 kunlik imtiyoz davridan keyin to'xtatildi");
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
