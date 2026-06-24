const db = require("../../db");

const formatOutputQuery = () =>
  db("worker_outputs as wo")
    .leftJoin("users as w", "w.id", "wo.worker_id")
    .leftJoin("products as p", "p.id", "wo.product_id")
    .leftJoin("departments as d", "d.id", "wo.department_id")
    .leftJoin("users as c", "c.id", "wo.created_by")
    .where("wo.is_deleted", false);

const selectOutputFields = (query) =>
  query.select(
    "wo.id",
    "wo.worker_id",
    db.raw("CONCAT(w.first_name, ' ', w.last_name) as worker_name"),
    "w.username as worker_username",
    "wo.product_id",
    "p.name as product_name",
    "p.model as product_model",
    "p.sku as product_sku",
    "wo.department_id",
    "d.name as department_name",
    "d.code as department_code",
    "wo.quantity",
    "wo.price_per_unit",
    "wo.total_amount",
    "wo.worked_at",
    "wo.note",
    "wo.created_by",
    db.raw("CONCAT(c.first_name, ' ', c.last_name) as created_by_name"),
    "wo.created_at",
    "wo.updated_at",
  );

const getFormattedOutput = async (id) =>
  selectOutputFields(formatOutputQuery().where("wo.id", id)).first();

module.exports = {
  formatOutputQuery,
  getFormattedOutput,
  selectOutputFields,
};
