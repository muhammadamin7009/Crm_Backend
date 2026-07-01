const service = require("./_services");
const httpValidator = require("../../shared/http-validator");
const schema = require("./_schemas");

exports.listAuditLogs = async (req, res, next) => {
  try {
    httpValidator({ query: req.query }, schema.listAuditLogs);
    res.json(await service.listAuditLogs(req.query));
  } catch (error) {
    next(error);
  }
};
