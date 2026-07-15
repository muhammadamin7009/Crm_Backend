const { assertRoleLimit } = require("../plan-user-limits");

module.exports = async (req, _res, next) => {
  try {
    const requestedRole = req.body?.role || "customer";
    await assertRoleLimit(requestedRole, req.company);
    next();
  } catch (error) {
    next(error);
  }
};
