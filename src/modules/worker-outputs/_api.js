const router = require("express").Router();
const { isLoggedIn, hasRole, hasPermission } = require("../../shared/auth");
const {
  createWorkerOutput,
  createBulkWorkerOutputs,
  getWorkerOutputs,
  getWorkerOutputsSummary,
  getWorkerOutput,
  patchWorkerOutput,
  removeWorkerOutput,
} = require("./_controllers");

const viewManager = [isLoggedIn, hasRole("super_admin", "admin", "worker"), hasPermission("production.view")];
const manageManager = [isLoggedIn, hasRole("super_admin", "admin"), hasPermission("production.manage")];

router.get("/worker-outputs", ...viewManager, getWorkerOutputs);
router.get("/worker-outputs/summary", ...viewManager, getWorkerOutputsSummary);
router.get("/worker-outputs/:id", ...viewManager, getWorkerOutput);
router.post("/worker-outputs/bulk", ...manageManager, createBulkWorkerOutputs);
router.post("/worker-outputs", ...manageManager, createWorkerOutput);
router.patch("/worker-outputs/:id", ...manageManager, patchWorkerOutput);
router.delete("/worker-outputs/:id", ...manageManager, removeWorkerOutput);

module.exports = router;
