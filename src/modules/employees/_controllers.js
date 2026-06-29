const validate = require("../../shared/http-validator");
const schemas = require("./_schemas");
const s = require("./_services");

const run = (schema, service, status = 200, mode = "body") => async (req, res, next) => {
  try {
    const input = {};
    if (schema.body) input.body = req.body;
    if (schema.params) input.params = req.params;
    if (schema.query) input.query = req.query;
    validate(input, schema);
    const data = mode === "query" ? req.query : mode === "id" ? Number(req.params.id) : req.body;
    const second = mode === "body" && req.params.id ? Number(req.params.id) : req.user;
    res.status(status).json(await service(data, second, req.user));
  } catch (error) { next(error); }
};

module.exports = {
  listPositions: run(schemas.list, s.listPositions, 200, "query"),
  createPosition: run(schemas.positionCreate, s.createPosition, 201),
  updatePosition: run(schemas.positionUpdate, s.updatePosition),
  listProfiles: run(schemas.list, s.listProfiles, 200, "query"),
  createProfile: run(schemas.profileCreate, s.createProfile, 201),
  updateProfile: run(schemas.profileUpdate, s.updateProfile),
  createAgreement: run(schemas.agreementCreate, s.createAgreement, 201),
  agreementHistory: run(schemas.id, s.agreementHistory, 200, "id"),
};
