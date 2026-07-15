const { ForbiddenError } = require("../errors");

const RULES = [
  { prefixes: ["/client-sales", "/client-payments"], feature: "client_accounting" },
  {
    prefixes: ["/suppliers", "/raw-materials", "/material-purchases", "/supplier-payments"],
    feature: "supplier_accounting",
  },
  {
    prefixes: [
      "/payroll-periods",
      "/payroll-lines",
      "/cash-transactions",
      "/client-returns",
      "/reports",
    ],
    feature: "finance",
  },
  { prefixes: ["/audit-logs"], feature: "audit_logs" },
];

module.exports = (req, _res, next) => {
  const rule = RULES.find((item) => item.prefixes.some((prefix) => req.path.startsWith(prefix)));
  if (!rule) return next();

  const features = Array.isArray(req.company?.plan_features) ? req.company.plan_features : [];
  if (!features.includes(rule.feature)) {
    return next(new ForbiddenError("Bu bo'lim joriy obuna rejangizga kirmaydi"));
  }
  next();
};
