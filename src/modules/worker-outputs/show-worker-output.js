const { assertCanSeeOutput, getExistingOutput } = require("./helpers");
const { getFormattedOutput } = require("./format-output");

const showWorkerOutput = async ({ id }, actor) => {
  const existing = await getExistingOutput(id);
  assertCanSeeOutput(existing, actor);

  const output = await getFormattedOutput(id);
  return { worker_output: output };
};

module.exports = showWorkerOutput;
