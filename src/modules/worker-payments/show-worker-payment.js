const { assertCanSeePayment, getExistingPayment } = require("./helpers");
const { getFormattedPayment } = require("./format-payment");

const showWorkerPayment = async ({ id }, actor) => {
  const existing = await getExistingPayment(id);
  assertCanSeePayment(existing, actor);

  const payment = await getFormattedPayment(id);
  return { worker_payment: payment };
};

module.exports = showWorkerPayment;
