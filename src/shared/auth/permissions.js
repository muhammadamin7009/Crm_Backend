const PERMISSIONS = [
  { key: "dashboard.view", label: "Bosh sahifani ko'rish", group: "Asosiy", description: "Dashboard sahifasiga kirish." },
  { key: "dashboard.finance", label: "Moliyaviy dashboardni ko'rish", group: "Asosiy", description: "Tushum, qarz, foyda va umumiy pul ko'rsatkichlarini ko'rish." },
  { key: "users.view", label: "Foydalanuvchilarni ko'rish", group: "Boshqaruv", description: "Hodimlar va mijozlar ro'yxatini ko'rish." },
  { key: "users.manage", label: "Foydalanuvchilarni boshqarish", group: "Boshqaruv", description: "Hodim qo'shish, tahrirlash va o'chirish." },
  { key: "employees.view", label: "Lavozim va kelishuvlarni ko'rish", group: "Boshqaruv", description: "Lavozimlar, profillar va kelishuvlarni ko'rish." },
  { key: "employees.manage", label: "Lavozim va kelishuvlarni boshqarish", group: "Boshqaruv", description: "Lavozim, profil va ish haqi kelishuvlarini o'zgartirish." },
  { key: "products.view", label: "Mahsulotlarni ko'rish", group: "Boshqaruv", description: "Mahsulotlar katalogini ko'rish." },
  { key: "products.manage", label: "Mahsulotlarni boshqarish", group: "Boshqaruv", description: "Mahsulot, rasm va bo'lim narxlarini boshqarish." },
  { key: "production.view", label: "Ish hisobotini ko'rish", group: "Ishlab chiqarish", description: "Ishchilar bajargan ishlarni ko'rish." },
  { key: "production.manage", label: "Ish hisobotini boshqarish", group: "Ishlab chiqarish", description: "Ish yozuvi qo'shish, tahrirlash va o'chirish." },
  { key: "payroll.view", label: "Oyliklarni ko'rish", group: "Ishlab chiqarish", description: "Ish haqi, avans va to'lovlarni ko'rish." },
  { key: "payroll.manage", label: "Oylik berish", group: "Ishlab chiqarish", description: "Ish haqi, avans va payroll amallarini bajarish." },
  { key: "client_sales.view", label: "Mijoz savdosini ko'rish", group: "Tashqi hisob", description: "Mijoz savdosi, tushum va qarzlarni ko'rish." },
  { key: "client_sales.manage", label: "Mijoz savdosini boshqarish", group: "Tashqi hisob", description: "Savdo va mijoz to'lovlarini qo'shish yoki o'zgartirish." },
  { key: "material_purchases.view", label: "Homashyo xaridini ko'rish", group: "Tashqi hisob", description: "Homashyo xaridi va ta'minotchi qarzlarini ko'rish." },
  { key: "material_purchases.manage", label: "Homashyo xaridini boshqarish", group: "Tashqi hisob", description: "Ta'minotchi, homashyo, xarid va to'lovlarni boshqarish." },
  { key: "inventory.view", label: "Ombor qoldig'ini ko'rish", group: "Ombor", description: "Omborlar, qoldiq va harakatlar tarixini ko'rish." },
  { key: "inventory.manage", label: "Omborni boshqarish", group: "Ombor", description: "Ombor, kirim, chiqim, ko'chirish va minimal qoldiqni boshqarish." },
  { key: "finance.view", label: "Moliya hisobini ko'rish", group: "Moliya", description: "Kassa, xarajatlar, hisobotlar va umumiy moliyani ko'rish." },
  { key: "finance.manage", label: "Moliya hisobini boshqarish", group: "Moliya", description: "Kassa, xarajat va moliyaviy amallarni bajarish." },
  { key: "audit_logs.view", label: "Amallar tarixini ko'rish", group: "Nazorat", description: "Kim qachon nima qilganini ko'rish." },
  { key: "permissions.manage", label: "Admin ruxsatlarini boshqarish", group: "Nazorat", description: "Adminlarga ichki ruxsat berish yoki olib tashlash." },
];

const ADMIN_DEFAULT_PERMISSIONS = PERMISSIONS
  .map((item) => item.key)
  .filter((key) => key !== "permissions.manage");

const PERMISSION_PRESETS = [
  {
    key: "sales_admin",
    label: "Savdo admini",
    description: "Mijozlar, mahsulotlar va savdo hisobini boshqaradi.",
    permissions: [
      "dashboard.view",
      "users.view",
      "products.view",
      "client_sales.view",
      "client_sales.manage",
    ],
  },
  {
    key: "production_admin",
    label: "Ishlab chiqarish admini",
    description: "Ishchilar, mahsulotlar va ishlab chiqarish hisobotini boshqaradi.",
    permissions: [
      "dashboard.view",
      "users.view",
      "employees.view",
      "products.view",
      "production.view",
      "production.manage",
      "payroll.view",
    ],
  },
  {
    key: "accountant",
    label: "Hisobchi",
    description: "Savdo, oylik, xarajat va moliyaviy hisobotlar bilan ishlaydi.",
    permissions: [
      "dashboard.view",
      "dashboard.finance",
      "users.view",
      "payroll.view",
      "payroll.manage",
      "client_sales.view",
      "finance.view",
      "finance.manage",
    ],
  },
  {
    key: "materials_admin",
    label: "Homashyo admini",
    description: "Ta'minotchilar, homashyo xaridi va ombor kirimini boshqaradi.",
    permissions: [
      "dashboard.view",
      "material_purchases.view",
      "material_purchases.manage",
      "inventory.view",
      "inventory.manage",
    ],
  },
];

const getPermissionPreset = (key) =>
  PERMISSION_PRESETS.find((preset) => preset.key === key) || null;

module.exports = {
  PERMISSIONS,
  ADMIN_DEFAULT_PERMISSIONS,
  PERMISSION_PRESETS,
  getPermissionPreset,
};
