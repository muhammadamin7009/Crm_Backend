const db = require("../../db");
const { getReqMeta } = require("./request-meta");

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const isHiddenField = (key) =>
  /password|token|authorization|secret/i.test(key) || key === "user_image";

const sanitize = (value, depth = 0) => {
  if (depth > 3) return "[qisqartirildi]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isHiddenField(key.toLowerCase()))
      .map(([key, item]) => [key, sanitize(item, depth + 1)]),
  );
};

const getEntityType = (req) => {
  const tenantPrefix = `/api/${req.params.companySlug}`;
  return req.path.replace(tenantPrefix, "").split("/").filter(Boolean)[0] || "unknown";
};

const getEntityId = (req) => {
  if (req.params.id) return String(req.params.id);
  const candidate = req.path
    .split("/")
    .filter(Boolean)
    .find((part) => /^\d+$/.test(part));
  return candidate || null;
};

module.exports = (req, res, next) => {
  if (!MUTATION_METHODS.has(req.method)) return next();

  res.once("finish", () => {
    if (!req.user || !req.company || res.statusCode >= 400) return;

    const { ip, user_agent } = getReqMeta(req);
    const details = {
      body: sanitize(req.body),
      query: sanitize(req.query),
    };

    db.root
      .transaction(async (trx) => {
        await trx.raw("SET LOCAL ROLE crm_tenant_user");
        await trx.raw("SELECT set_config('app.current_company_id', ?, true)", [
          String(req.company.id),
        ]);
        await trx("audit_logs").insert({
          company_id: req.company.id,
          actor_user_id: req.user.id,
          action: req.method,
          entity_type: getEntityType(req),
          entity_id: getEntityId(req),
          path: req.originalUrl.split("?")[0],
          status_code: res.statusCode,
          details,
          ip,
          user_agent,
        });
      })
      .catch((error) => console.error("Audit log yozilmadi:", error.message));
  });

  next();
};
