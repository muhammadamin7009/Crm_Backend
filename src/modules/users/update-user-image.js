const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

module.exports = async ({ id, user_image }) => {
  const [user] = await db("users")
    .where({ id, is_deleted: false })
    .update({ user_image, updated_at: db.fn.now() })
    .returning([
      "id",
      "first_name",
      "last_name",
      "username",
      "phone",
      "role",
      "user_image",
      "created_at",
      "updated_at",
    ]);

  if (!user) throw new NotFoundError("User topilmadi");

  return { user };
};
