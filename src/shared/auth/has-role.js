const { ForbiddenError } = require("../errors");

const hasRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      throw new ForbiddenError("Role aniqlanmadi");
    }

    if (!roles.includes(userRole)) {
      throw new ForbiddenError("Sizda bu yo'lga kirishga ruxsat yo'q");
    }

    next();
  };
};

module.exports = hasRole;
