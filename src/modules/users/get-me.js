const db = require("../../db");
const { NotFoundError } = require("../../shared/errors");

const getMeService = async (actor) => {
  const me = await db("users")
    .where({ id: actor.id, is_deleted: false })
    .select(
      "id",
      "first_name",
      "last_name",
      "username",
      "user_image",
      "role",
      "phone",
      "created_at",
      "updated_at",
    )
    .first();

  if (!me) {
    throw new NotFoundError("User topilmadi");
  }

  return { me };
};

module.exports = getMeService;
