const { getAdvanceBalance, resolveWorkerId } = require("./helpers");

const getWorkerAdvanceBalance = async ({ worker_id }, actor) => {
  const workerId = await resolveWorkerId(worker_id, actor);
  return { worker_id: workerId, balance: await getAdvanceBalance(workerId) };
};

module.exports = getWorkerAdvanceBalance;
