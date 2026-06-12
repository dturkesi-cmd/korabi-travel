require("dotenv").config();

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

module.exports = {
  port: num(process.env.PORT, 3847),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  duffelToken: process.env.DUFFEL_ACCESS_TOKEN || "",
  duffelWebhookSecret: process.env.DUFFEL_WEBHOOK_SECRET || "",
  geminiKey: process.env.GEMINI_API_KEY || "",
  loyaltyEarnPct: num(process.env.LOYALTY_EARN_PCT, 2),
  memberDiscountPct: num(process.env.MEMBER_DISCOUNT_PCT, 4),
  marketplaceCommissionPct: num(process.env.MARKETPLACE_COMMISSION_PCT, 12),
  marketplaceCutoffHours: num(process.env.MARKETPLACE_CUTOFF_HOURS, 6),
  suppliers: {
    skybird: process.env.SUPPLIER_SKYBIRD_ENABLED === "true",
    vax: process.env.SUPPLIER_VAX_ENABLED === "true",
  },
  adminEmail: process.env.ADMIN_EMAIL || "admin@korabi.test",
  adminPassword: process.env.ADMIN_PASSWORD || "changeme",
  sessionDays: 14,
  bodyLimit: "256kb",
  shtegBaseUrl: process.env.SHTEG_API_BASE_URL || "",
  shtegBearer: process.env.SHTEG_API_BEARER || "",
  shtegAgencyId: process.env.SHTEG_AGENCY_ID || "korabi",
  shtegArcNumber: process.env.SHTEG_ARC_NUMBER || "",
  shtegSettlementMode: (() => {
    const m = (process.env.SHTEG_SETTLEMENT_MODE || "").toLowerCase();
    if (m === "off" || m === "sandbox" || m === "live") return m;
    if (process.env.SHTEG_API_BASE_URL && process.env.SHTEG_API_BEARER) return "live";
    if (process.env.SHTEG_API_BASE_URL || process.env.SHTEG_SETTLEMENT_MODE === "sandbox") return "sandbox";
    return "sandbox";
  })(),
  checkoutMode: (process.env.KORABI_CHECKOUT_MODE || "korabi").toLowerCase(),
};
