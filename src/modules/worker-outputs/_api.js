const router = require("express").Router();
const { isLoggedIn, hasRole } = require("../../shared/auth");
const {
  createWorkerOutput,
  getWorkerOutputs,
  getWorkerOutputsSummary,
  getWorkerOutput,
  patchWorkerOutput,
  removeWorkerOutput,
} = require("./_controllers");

router.get("/worker-outputs", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerOutputs);
router.get("/worker-outputs/summary", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerOutputsSummary);
router.get("/worker-outputs/:id", isLoggedIn, hasRole("super_admin", "admin", "worker"), getWorkerOutput);
router.post(
  "/worker-outputs",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  createWorkerOutput,
);
router.patch(
  "/worker-outputs/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  patchWorkerOutput,
);
router.delete(
  "/worker-outputs/:id",
  isLoggedIn,
  hasRole("super_admin", "admin"),
  removeWorkerOutput,
);

module.exports = router;
