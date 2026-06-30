const jwt = require("jsonwebtoken");
const config = require("../config");
const { UnauthorizedError } = require("../errors");

const isLoggedIn = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    // "Bearer xxx" bo'lsa ham, "xxx" bo'lsa ham ishlaydi
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token) {
      throw new UnauthorizedError("Login qilmagansiz");
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    // login-user.js da token ichiga role ham qo'shdik
    req.user = {
      id: decoded.id,
      role: decoded.role,
      company_id: decoded.company_id,
      company_slug: decoded.company_slug,
    };

    if (
      !decoded.company_id ||
      !req.company ||
      Number(decoded.company_id) !== Number(req.company.id) ||
      decoded.company_slug !== req.company.slug
    ) {
      throw new UnauthorizedError("Token boshqa korxonaga tegishli");
    }

    next();
  } catch (error) {
    next(new UnauthorizedError("Login qilmagansiz"));
  }
};

module.exports = isLoggedIn;
