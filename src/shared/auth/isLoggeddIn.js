const jwt = require("jsonwebtoken");
const db = require("../../db");
const config = require("../config");
const { UnauthorizedError } = require("../errors");

const getUserPermissions = async (user) => {
  if (user.role === "super_admin") return ["*"];
  if (!["admin", "worker"].includes(user.role)) return [];

  const rows = await db("user_permissions")
    .where({ user_id: user.id, allowed: true })
    .select("permission_key");

  return rows.map((row) => row.permission_key);
};

const isLoggedIn = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
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
      permissions: [],
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

    req.user.permissions = await getUserPermissions(req.user);

    if (Date.now() - new Date(session.last_used_at).getTime() > 5 * 60 * 1000) {
      await db("user_sessions").where({ id: session.id }).update({ last_used_at: db.fn.now() });
    }

    next();
  } catch (error) {
    const isTokenError = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
      error?.name,
    );

    if (error instanceof UnauthorizedError || isTokenError) {
      return next(new UnauthorizedError("Login qilmagansiz yoki sessiya tugagan"));
    }

    next(error);
  }
};

module.exports = isLoggedIn;
