// Партнёр газрууд — DB-д хадгалагдана (супер админ удирдана).
// Энд зөвхөн ангилал болон emoji сонголтыг тодорхойлно.

export type PartnerCategory = "Карго" | "Дэлгүүр" | "Зах" | "Кофе шоп" | "Тээш" | "Аптек";

export interface Partner {
  id: string;
  name: string;
  category: PartnerCategory;
  emoji: string;
  address: string; // авах дүүрэг/бүс
  detail: string;  // гудамж, байр
  area: string;    // хот/бүс
}

export const PARTNER_CATEGORIES: { key: PartnerCategory; emoji: string }[] = [
  { key: "Карго",     emoji: "📦" },
  { key: "Дэлгүүр",   emoji: "🏪" },
  { key: "Зах",       emoji: "🛒" },
  { key: "Кофе шоп",  emoji: "☕" },
  { key: "Тээш",      emoji: "🧳" },
  { key: "Аптек",     emoji: "💊" },
];

// Супер админ газар нэмэхэд сонгох emoji-нууд
export const PARTNER_EMOJIS = ["📦", "🏪", "🛒", "☕", "🧳", "💊", "🎁", "🍱", "🥖", "🌸", "🍔", "📱"];
