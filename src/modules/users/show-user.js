const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const showUser = async ({ id }) => {
  const user = await db("users")
    .where({ id, is_deleted: false })
    .select(
      "id",
      "first_name",
      "last_name",
      "user_image",
      "username",
      "role",
      "phone",
      "created_at",
      "updated_at",
    )
    .first();

  if (!user) throw new NotFoundError("User topilmadi");

  return { user };
};

module.exports = showUser;
