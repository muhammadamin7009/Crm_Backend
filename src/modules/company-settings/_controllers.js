const service = require("./_services");

const getBranding = async (req, res, next) => {
  try {
    res.json(service.getBranding(req.company));
  } catch (error) {
    next(error);
  }
};

const updateLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Logo fayli tanlanmagan" });
    const logoUrl = `/uploads/company-logos/${req.file.filename}`;
    res.json(await service.updateLogo(req.company, logoUrl));
  } catch (error) {
    if (req.file) {
      await service.removeLocalLogo(`/uploads/company-logos/${req.file.filename}`).catch(() => {});
    }
    next(error);
  }
};

const deleteLogo = async (req, res, next) => {
  try {
    res.json(await service.deleteLogo(req.company));
  } catch (error) {
    next(error);
  }
};

module.exports = { getBranding, updateLogo, deleteLogo };
