const getReqMeta = (req) => {
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  const user_agent = req.headers["user-agent"] || null;

  return { ip, user_agent };
};

module.exports = { getReqMeta };
