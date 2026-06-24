const { getExistingDepartment } = require("./helpers");

const showDepartment = async ({ id }) => {
  const department = await getExistingDepartment(id);

  return { department };
};

module.exports = showDepartment;
