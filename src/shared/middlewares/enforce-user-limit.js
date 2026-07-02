const db = require("../../db");
const { BadRequestError } = require("../errors");

module.exports = async (req, _res, next) => {
  try {
    const maxUsers = Number(req.company?.plan_max_users || 0);
    if (!maxUsers) return next();
    const row = await db("users").where({ is_deleted: false }).count({ count: "id" }).first();
    if (Number(row.count) >= maxUsers) {
      throw new BadRequestError(
        `${req.company.plan_name || "Joriy"} tarifida maksimum ${maxUsers} ta foydalanuvchi mumkin`,
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};
