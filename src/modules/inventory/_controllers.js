const httpValidator = require("../../shared/http-validator");
const schemas = require("./_schemas");
const service = require("./_services");

const validate = (req, schema) =>
  httpValidator(
    {
      body: schema.body ? req.body : undefined,
      params: schema.params ? req.params : undefined,
      query: schema.query ? req.query : undefined,
    },
    schema,
  );

const handle =
  (schema, callback, status = 200) =>
  async (req, res, next) => {
    try {
      validate(req, schema);
      const result = await callback(req);
      res.status(status).json(result);
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  listWarehouses: handle(schemas.listWarehouses, (req) => service.listWarehouses(req.query)),
  inventorySummary: handle({}, () => service.inventorySummary()),
  createWarehouse: handle(
    schemas.createWarehouse,
    (req) => service.createWarehouse(req.body, req.user),
    201,
  ),
  updateWarehouse: handle(schemas.updateWarehouse, (req) =>
    service.updateWarehouse(Number(req.params.id), req.body),
  ),
  archiveWarehouse: handle(schemas.id, (req) => service.archiveWarehouse(Number(req.params.id))),
  listStock: handle(schemas.listStock, (req) => service.listStock(req.query)),
  listLowStock: handle(schemas.listStock, (req) => service.listLowStock(req.query)),
  listItems: handle(schemas.listItems, (req) => service.listItems(req.query)),
  updateThreshold: handle(schemas.updateThreshold, (req) =>
    service.updateThreshold(Number(req.params.id), req.body.minimum_quantity),
  ),
  listMovements: handle(schemas.listMovements, (req) => service.listMovements(req.query)),
  createMovement: handle(
    schemas.createMovement,
    (req) => service.createMovement(req.body, req.user),
    201,
  ),
  createProductionReceipt: handle(
    schemas.createProductionReceipt,
    (req) => service.createProductionReceipt(req.body, req.user),
    201,
  ),
  createTransfer: handle(
    schemas.createTransfer,
    (req) => service.createTransfer(req.body, req.user),
    201,
  ),
  listCounts: handle(schemas.listCounts, (req) => service.listCounts(req.query)),
  getCount: handle(schemas.id, (req) => service.getCount(Number(req.params.id))),
  createCount: handle(schemas.createCount, (req) => service.createCount(req.body, req.user), 201),
};
