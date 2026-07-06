const jwt = require("jsonwebtoken");
const db = require("../../db");
const config = require("../config");
const { UnauthorizedError } = require("../errors");

const isLoggedIn = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";

    // "Bearer xxx" bo'lsa ham, "xxx" bo'lsa ham ishlaydi
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;

    if (!token) {
      throw new UnauthorizedError("Login qilmagansiz");
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    if (!decoded.jti || !decoded.session_id) throw new UnauthorizedError("Sessiya eskirgan");

    req.user = {
      id: decoded.id,
      role: decoded.role,
      company_id: decoded.company_id,
      company_slug: decoded.company_slug,
      session_id: decoded.session_id,
    };

    if (
      !decoded.company_id ||
      !req.company ||
      Number(decoded.company_id) !== Number(req.company.id) ||
      decoded.company_slug !== req.company.slug
    ) {
      throw new UnauthorizedError("Token boshqa korxonaga tegishli");
    }

    const session = await db("user_sessions")
      .where({ id: decoded.session_id, token_jti: decoded.jti, user_id: decoded.id })
      .whereNull("revoked_at")
      .where("expires_at", ">", db.fn.now())
      .first();
    if (!session) throw new UnauthorizedError("Sessiya faol emas");

    if (Date.now() - new Date(session.last_used_at).getTime() > 5 * 60 * 1000) {
      await db("user_sessions").where({ id: session.id }).update({ last_used_at: db.fn.now() });
    }

    next();
  } catch (_error) {
    next(new UnauthorizedError("Login qilmagansiz yoki sessiya tugagan"));
  }
};

module.exports = isLoggedIn;
