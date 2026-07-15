const INVENTORY_PERMISSIONS = [
  {
    key: "inventory.movements",
    label: "Ombor kirim-chiqimi",
    group: "Ombor",
    description: "Kirim, chiqim, omborlar orasida ko'chirish va minimal qoldiqni boshqarish.",
  },
  {
    key: "inventory.count",
    label: "Inventarizatsiya o'tkazish",
    group: "Ombor",
    description: "Omborni sanash, amaldagi qoldiqni kiritish va farqni tasdiqlash.",
  },
  {
    key: "inventory.warehouses",
    label: "Omborlar tuzilishini boshqarish",
    group: "Ombor",
    description: "Yangi ombor yaratish, nomini tahrirlash yoki bo'sh omborni o'chirish.",
  },
];

exports.up = async function (knex) {
  const currentMax = await knex("permission_catalog").max({ max: "sort_order" }).first();
  const start = Number(currentMax?.max || 0) + 1;

  await knex("permission_catalog")
    .insert(
      INVENTORY_PERMISSIONS.map((permission, index) => ({
        ...permission,
        sort_order: start + index,
      })),
    )
    .onConflict("key")
    .merge(["label", "group", "description"]);
};

exports.down = async function (knex) {
  await knex("user_permissions")
    .whereIn(
      "permission_key",
      INVENTORY_PERMISSIONS.map((permission) => permission.key),
    )
    .delete();
  await knex("permission_catalog")
    .whereIn(
      "key",
      INVENTORY_PERMISSIONS.map((permission) => permission.key),
    )
    .delete();
};
