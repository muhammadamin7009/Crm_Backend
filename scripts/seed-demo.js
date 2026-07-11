require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../src/db");

const DEMO_MARKER = "[DEMO]";
const demoPassword = process.env.DEMO_PASSWORD || "Demo123!";

const isoDate = (date) => date.toISOString().slice(0, 10);

const daysAgo = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return isoDate(date);
};

const firstOrInsert = async (trx, table, where, values) => {
  const existing = await trx(table).where(where).first();
  if (existing) return existing;
  const [created] = await trx(table).insert({ ...where, ...values }).returning("*");
  return created;
};

const selectCompany = async () => {
  const query = db.root("companies").where({ status: "active" });
  if (process.env.DEMO_COMPANY_SLUG) query.andWhere({ slug: process.env.DEMO_COMPANY_SLUG });
  const companies = await query.orderBy("id", "asc");

  if (!companies.length) throw new Error("Demo uchun faol korxona topilmadi");
  if (companies.length > 1 && !process.env.DEMO_COMPANY_SLUG) {
    throw new Error("Bir nechta korxona bor. DEMO_COMPANY_SLUG ni aniq ko'rsating");
  }
  return companies[0];
};

const seed = async () => {
  const company = await selectCompany();
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const summary = await db.root.transaction(async (trx) => {
    const manager = await trx("users")
      .where({ company_id: company.id, role: "super_admin", is_deleted: false })
      .first();
    if (!manager) throw new Error("Korxonada super_admin topilmadi");

    const userDefinitions = [
      ["demo_mijoz_1", "Aziz", "Karimov", "client"],
      ["demo_mijoz_2", "Dilshod", "Rahimov", "client"],
      ["demo_mijoz_3", "Malika", "Sodiqova", "client"],
      ["demo_ishchi_1", "Jasur", "Aliyev", "worker"],
      ["demo_ishchi_2", "Sardor", "Toshpulatov", "worker"],
      ["demo_ishchi_3", "Nodira", "Usmonova", "worker"],
      ["demo_ishchi_4", "Komil", "Ergashev", "worker"],
    ];

    const users = {};
    for (const [username, firstName, lastName, role] of userDefinitions) {
      users[username] = await firstOrInsert(
        trx,
        "users",
        { company_id: company.id, username },
        {
          first_name: firstName,
          last_name: lastName,
          password: passwordHash,
          role,
          is_deleted: false,
          created_by: manager.id,
        },
      );
    }

    const category = await firstOrInsert(
      trx,
      "categories",
      { company_id: company.id, name: "Demo mahsulotlar" },
      { description: `${DEMO_MARKER} Taqdimot mahsulotlari`, created_by: manager.id },
    );

    const productDefinitions = [
      ["DEMO-TUF-01", "Klassik tufli", "Qora", 320000, 520000],
      ["DEMO-KRS-02", "Krossovka", "Oq", 280000, 470000],
    ];
    const products = [];
    for (const [sku, name, color, purchasePrice, salePrice] of productDefinitions) {
      products.push(
        await firstOrInsert(
          trx,
          "products",
          { company_id: company.id, sku },
          {
            category_id: category.id,
            name,
            color,
            unit: "dona",
            purchase_price: purchasePrice,
            sale_price: salePrice,
            description: `${DEMO_MARKER} Taqdimot uchun`,
            created_by: manager.id,
          },
        ),
      );
    }

    const department = await firstOrInsert(
      trx,
      "departments",
      { company_id: company.id, code: "demo-tikuv" },
      {
        name: "Demo tikuv",
        description: `${DEMO_MARKER} Taqdimot bo'limi`,
        sort_order: 90,
        created_by: manager.id,
      },
    );

    const supplier = await firstOrInsert(
      trx,
      "suppliers",
      { company_id: company.id, name: "Demo Textile Supply" },
      { phone: "+998901112233", note: `${DEMO_MARKER} Taqdimot ta'minotchisi` },
    );
    const leather = await firstOrInsert(
      trx,
      "raw_materials",
      { company_id: company.id, name: "Tabiiy charm", unit: "metr" },
      { note: `${DEMO_MARKER} Taqdimot homashyosi` },
    );
    const sole = await firstOrInsert(
      trx,
      "raw_materials",
      { company_id: company.id, name: "Taglik", unit: "juft" },
      { note: `${DEMO_MARKER} Taqdimot homashyosi` },
    );

    const purchaseDefinitions = [
      { date: daysAgo(6), subtotal: 6000000, paid: 4000000, material: leather, quantity: 100, unitPrice: 60000 },
      { date: daysAgo(3), subtotal: 3600000, paid: 2600000, material: sole, quantity: 120, unitPrice: 30000 },
    ];
    for (const item of purchaseDefinitions) {
      const note = `${DEMO_MARKER} Homashyo xaridi ${item.date}`;
      let purchase = await trx("material_purchases")
        .where({ company_id: company.id, note })
        .first();
      if (!purchase) {
        [purchase] = await trx("material_purchases")
          .insert({
            company_id: company.id,
            supplier_id: supplier.id,
            purchased_at: item.date,
            subtotal: item.subtotal,
            paid_amount: item.paid,
            debt_amount: item.subtotal - item.paid,
            note,
            created_by: manager.id,
          })
          .returning("*");
        await trx("material_purchase_items").insert({
          company_id: company.id,
          purchase_id: purchase.id,
          raw_material_id: item.material.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.subtotal,
        });
      }
    }

    const clients = [users.demo_mijoz_1, users.demo_mijoz_2, users.demo_mijoz_3];
    for (let index = 0; index < clients.length; index += 1) {
      const quantity = 4 + index * 2;
      const product = products[index % products.length];
      const total = quantity * Number(product.sale_price);
      const note = `${DEMO_MARKER} Savdo ${index + 1}`;
      const exists = await trx("client_sales").where({ company_id: company.id, note }).first();
      if (!exists) {
        await trx("client_sales").insert({
          company_id: company.id,
          client_id: clients[index].id,
          product_id: product.id,
          quantity,
          unit_price: product.sale_price,
          total_amount: total,
          paid_amount: Math.round(total * 0.7),
          debt_amount: total - Math.round(total * 0.7),
          sold_at: daysAgo(5 - index),
          note,
          created_by: manager.id,
        });
      }
    }

    const workers = [users.demo_ishchi_1, users.demo_ishchi_2, users.demo_ishchi_3, users.demo_ishchi_4];
    for (let day = 6; day >= 0; day -= 1) {
      for (let index = 0; index < workers.length; index += 1) {
        const workedAt = daysAgo(day);
        const note = `${DEMO_MARKER} Haftalik ish ${workedAt}`;
        const exists = await trx("worker_outputs")
          .where({ company_id: company.id, worker_id: workers[index].id, worked_at: workedAt, note })
          .first();
        if (!exists) {
          const quantity = 8 + index + (day % 3);
          const pricePerUnit = 25000 + index * 2500;
          await trx("worker_outputs").insert({
            company_id: company.id,
            worker_id: workers[index].id,
            product_id: products[index % products.length].id,
            department_id: department.id,
            quantity,
            price_per_unit: pricePerUnit,
            total_amount: quantity * pricePerUnit,
            worked_at: workedAt,
            note,
            created_by: manager.id,
          });
        }
      }
    }

    for (let index = 0; index < workers.length; index += 1) {
      const note = `${DEMO_MARKER} Bir haftalik oylik`;
      const exists = await trx("worker_payments")
        .where({ company_id: company.id, worker_id: workers[index].id, note })
        .first();
      if (!exists) {
        await trx("worker_payments").insert({
          company_id: company.id,
          worker_id: workers[index].id,
          amount: 1200000 + index * 150000,
          payment_type: "salary",
          paid_at: daysAgo(0),
          period_from: daysAgo(6),
          period_to: daysAgo(0),
          note,
          created_by: manager.id,
        });
      }
    }

    return { users: Object.keys(users).length, clients: 3, workers: 4, products: 2, purchases: 2, work_days: 7 };
  });

  console.log(`Demo ma'lumotlar tayyor: ${company.name} (${company.slug})`);
  console.log(summary);
  console.log("Demo loginlar: demo_mijoz_1 ... demo_ishchi_4");
  console.log(`Demo parol: ${demoPassword}`);
  if (!process.env.DEMO_PASSWORD) {
    console.warn("Ogohlantirish: standart demo parol ishlatildi. Taqdimotdan keyin almashtiring.");
  }
};

seed()
  .catch((error) => {
    console.error("Demo ma'lumot yaratilmadi:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.root.destroy());
