const db = require("../../db");
const bcrypt = require("bcryptjs");
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} = require("../../shared/errors");

const ROLE = {
  SUPER: "super_admin",
  ADMIN: "admin",
  CLIENT: "client",
  SUPPLIER: "supplier",
  CUSTOMER: "customer",
};

const editUser = async (body, { id }, actor) => {
  // target user
  const target = await db("users")
    .where({ id, is_deleted: false })
    .select("id", "role", "username")
    .first();

  if (!target) throw new NotFoundError("User topilmadi");

  const actorId = actor?.id;
  const actorRole = actor?.role;

  // Patch /users/me bo'lsa actorId === id bo'ladi (controller shunday yuboryapti)
  const isSelf = Number(actorId) === Number(id);

  // 1) /users/:id route super_admin/admin bilan cheklangan (middleware),
  // lekin /users/me ham editUser’ga kiradi.
  // Bu yerda nozik qoidalarni tekshiramiz:

  // Admin -> super_admin yoki admin ni edit qila olmaydi
  if (!isSelf && actorRole === ROLE.ADMIN) {
    if (target.role === ROLE.SUPER || target.role === ROLE.ADMIN) {
      throw new ForbiddenError(
        "Admin -- Super_admin yoki boshqa adminni edit qila olmaydi",
      );
    }
  }

  // 2) Role update qoidalari
  const patch = { ...body, updated_at: db.fn.now() };

  // Self editda role umuman ruxsat emas (schema ham yo'q),
  // lekin ehtiyot uchun baribir bloklaymiz:
  if (isSelf && patch.role !== undefined) {
    throw new BadRequestError("O'zingiz role'ni o'zgartira olmaysiz");
  }

  // Hech kim (hatto super_admin ham) yangi super_admin tayinlay olmaydi
  if (patch.role === ROLE.SUPER) {
    throw new BadRequestError(
      "super_admin role berib bo'lmaydi (loyihada 1 ta)",
    );
  }

  // Super_admin o'z roleni o'zgartira olmaydi (explicit)
  if (isSelf && actorRole === ROLE.SUPER && patch.role) {
    throw new BadRequestError("super_admin o'z roleni o'zgartira olmaydi");
  }

  // Admin role bo'yicha cheklov: admin boshqa userni admin qilolmaydi
  if (!isSelf && actorRole === ROLE.ADMIN && patch.role) {
    if (patch.role === ROLE.ADMIN) {
      throw new BadRequestError("Admin boshqa userga admin role bera olmaydi");
    }
  }

  // 3) username unique check (is_deleted=false)
  if (patch.username && patch.username !== target.username) {
    const dup = await db("users")
      .where({ username: patch.username, is_deleted: false })
      .first();

    if (dup) throw new BadRequestError("Username already exists");
  }

  // 4) password hash
  if (patch.password) {
    patch.password = await bcrypt.hash(patch.password, 10);
  }

  const [updated] = await db("users")
    .where({ id })
    .update(patch)
    .returning([
      "id",
      "first_name",
      "last_name",
      "username",
      "user_image",
      "role",
      "phone",
      "created_at",
      "updated_at",
    ]);

  return { updated_user: updated };
};

module.exports = editUser;
