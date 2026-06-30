const jwt = require("jsonwebtoken");
const config = require("../config");
const { UnauthorizedError } = require("../errors");

module.exports = (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.scope !== "platform") throw new Error("invalid scope");
    req.platformAdmin = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    next(new UnauthorizedError("Platform boshqaruviga qayta kiring"));
  }
};
