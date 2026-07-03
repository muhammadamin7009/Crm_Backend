const db = require("../../db");
const {
  BadRequestError,
  NotFoundError,
} = require("../../shared/errors");

const getDeletedUser = async (id) => {
  const user = await db("users")
    .where({ id, is_deleted: true })
    .select("id", "username", "role")
    .first();

  if (!user) throw new NotFoundError("O'chirilgan hodim topilmadi");
  if (user.role === "super_admin") {
    throw new BadRequestError("Super admin uchun bu amalni bajarib bo'lmaydi");
  }

  return user;
};

const restoreUser = async ({ id }) => {
  const user = await getDeletedUser(id);
  const duplicate = await db("users")
    .where({ username: user.username, is_deleted: false })
    .whereNot({ id: user.id })
    .first();

  if (duplicate) {
    throw new BadRequestError(
      "Bu username bilan faol hodim mavjud. Avval username'ni tahrirlang.",
    );
  }

  const [restored] = await db("users")
    .where({ id: user.id, is_deleted: true })
    .update({ is_deleted: false, updated_at: db.fn.now() })
    .returning(["id", "first_name", "last_name", "username", "role"]);

  return { restored_user: restored };
};

const permanentlyDeleteUser = async ({ id }) => {
  const user = await getDeletedUser(id);

  try {
    await db("users").where({ id: user.id, is_deleted: true }).del();
  } catch (error) {
    if (error?.code === "23503") {
      throw new BadRequestError(
        "Bu hodimga ish yoki hisob-kitob tarixi bog'langan. Uni butkul o'chirib bo'lmaydi.",
      );
    }
    throw error;
  }

  return { permanently_deleted_user: { id: user.id } };
};

module.exports = { restoreUser, permanentlyDeleteUser };
