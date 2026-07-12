const fs = require("fs/promises");
const path = require("path");
const db = require("../../db");

const LOGO_PREFIX = "/uploads/company-logos/";
const LOGO_DIR = path.resolve(__dirname, "../../..", "uploads", "company-logos");

const removeLocalLogo = async (logoUrl) => {
  if (!logoUrl?.startsWith(LOGO_PREFIX)) return;
  const filename = path.basename(logoUrl);
  const filePath = path.resolve(LOGO_DIR, filename);
  if (!filePath.startsWith(`${LOGO_DIR}${path.sep}`)) return;
  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};

const getBranding = (company) => ({
  company: {
    id: company.id,
    name: company.name,
    slug: company.slug,
    logo_url: company.logo_url || null,
  },
});

const updateLogo = async (company, logoUrl) => {
  const previousLogo = company.logo_url;
  const [updated] = await db
    .root("companies")
    .where({ id: company.id, status: "active" })
    .update({ logo_url: logoUrl, updated_at: db.root.fn.now() })
    .returning(["id", "name", "slug", "logo_url"]);
  if (previousLogo && previousLogo !== logoUrl) {
    await removeLocalLogo(previousLogo).catch((error) =>
      console.error("Eski korxona logosi o'chirilmadi:", error.message),
    );
  }
  return { company: updated };
};

const deleteLogo = async (company) => {
  const previousLogo = company.logo_url;
  const [updated] = await db
    .root("companies")
    .where({ id: company.id })
    .update({ logo_url: null, updated_at: db.root.fn.now() })
    .returning(["id", "name", "slug", "logo_url"]);
  if (previousLogo) {
    await removeLocalLogo(previousLogo).catch((error) =>
      console.error("Korxona logo fayli o'chirilmadi:", error.message),
    );
  }
  return { company: updated, message: "Korxona logosi o'chirildi" };
};

module.exports = { getBranding, updateLogo, deleteLogo, removeLocalLogo };
