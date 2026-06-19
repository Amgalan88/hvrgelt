// Партнёр газрууд — одоогоор mock дата (дараа нь DB-д шилжинэ).

export type PartnerCategory = "Карго" | "Дэлгүүр" | "Зах" | "Кофе шоп" | "Тээш";

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
];

export const PARTNERS: Partner[] = [
  // ── Карго ──
  { id: "p-cargo-1", name: "Дархан бүсийн карго", category: "Карго", emoji: "📦", address: "Дархан, 9-р баг", detail: "Төв агуулах, 2-р гудамж", area: "Дархан" },
  { id: "p-cargo-2", name: "Эрээн экспресс карго", category: "Карго", emoji: "📦", address: "Дархан, 5-р баг", detail: "Ачаа тээврийн төв", area: "Дархан" },
  { id: "p-cargo-3", name: "Номин карго", category: "Карго", emoji: "📦", address: "Дархан, 14-р баг", detail: "Зүүн салбар", area: "Дархан" },

  // ── Дэлгүүр ──
  { id: "p-shop-1", name: "Их дэлгүүр", category: "Дэлгүүр", emoji: "🏪", address: "Дархан, төв", detail: "Соёлын ордны баруун талд", area: "Дархан" },
  { id: "p-shop-2", name: "Минии маркет", category: "Дэлгүүр", emoji: "🏪", address: "Дархан, 8-р баг", detail: "16-р байрны 1 давхар", area: "Дархан" },
  { id: "p-shop-3", name: "Гэр ахуйн дэлгүүр", category: "Дэлгүүр", emoji: "🏪", address: "Дархан, 12-р баг", detail: "Шинэ хороолол", area: "Дархан" },

  // ── Зах ──
  { id: "p-zah-1", name: "Төв зах", category: "Зах", emoji: "🛒", address: "Дархан, төв", detail: "Худалдааны төв", area: "Дархан" },
  { id: "p-zah-2", name: "Хүнсний зах", category: "Зах", emoji: "🛒", address: "Дархан, 7-р баг", detail: "Баруун орц", area: "Дархан" },

  // ── Кофе шоп ──
  { id: "p-coffee-1", name: "Caffe Bene", category: "Кофе шоп", emoji: "☕", address: "Дархан, төв", detail: "Гол гудамж 4", area: "Дархан" },
  { id: "p-coffee-2", name: "Tom N Toms", category: "Кофе шоп", emoji: "☕", address: "Дархан, 9-р баг", detail: "Их дэлгүүрийн 1 давхар", area: "Дархан" },
  { id: "p-coffee-3", name: "Local Coffee", category: "Кофе шоп", emoji: "☕", address: "Дархан, 10-р баг", detail: "Шинэ төв", area: "Дархан" },

  // ── Тээш ──
  { id: "p-teesh-1", name: "Хурдан тээш", category: "Тээш", emoji: "🧳", address: "Дархан, автовокзал", detail: "Тээшний цэг 1", area: "Дархан" },
  { id: "p-teesh-2", name: "Улаанбаатар тээш", category: "Тээш", emoji: "🧳", address: "Дархан, автовокзал", detail: "Тээшний цэг 3", area: "Дархан" },
];
