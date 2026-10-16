// Хүргэгчийн тээврийн хэрэгсэл ба баталгаажуулалтад шаардах баримт.
//
// Шаардлага нь хэрэгслээс хамаарна:
//   • явган, дугуй — зөвхөн цээж зураг (дугуйны зураг заавал биш)
//   • мопед       — цээж зураг, жолооны үнэмлэх, мопедын зураг
//   • мотоцикл, автомашин — дээрх + улсын дугаар, үнэмлэхийн дугаар
//
// Хүргэгчийн "Баримт" таб, супер админы шалгалт, үйлчлүүлэгчид харагдах
// хүргэгчийн мэдээлэл бүгд эндээс уншина.

import type { CourierDocs } from "../components/shared/types";

export const VEHICLES = ["явган", "дугуй", "мопед", "мотоцикл", "автомашин"] as const;
export type Vehicle = (typeof VEHICLES)[number];

export const VEHICLE_ICON: Record<string, string> = { явган: "🚶", дугуй: "🚲", мопед: "🛵", мотоцикл: "🏍️", автомашин: "🚗" };

/** Хэрэгслийн нэрийн "-ын/-ийн" хэлбэр — "Мотоциклын зураг" */
const VEHICLE_PHOTO_LABEL: Record<string, string> = {
  дугуй: "Дугуйны зураг",
  мопед: "Мопедын зураг",
  мотоцикл: "Мотоциклын зураг",
  автомашин: "Машины зураг",
};

export type DocKey = "photoUrl" | "licensePhotoUrl" | "carPhotoUrl" | "plate" | "licenseNo" | "licenseClass" | "licenseExpiry";

export interface DocItem {
  key: DocKey;
  label: string;
  required: boolean;
}

/** Моторт хэрэгсэл — жолооны үнэмлэх шаардана */
export function isMotorized(v?: string): boolean {
  return v === "мопед" || v === "мотоцикл" || v === "автомашин";
}

/** Улсын дугаартай хэрэгсэл */
export function hasPlate(v?: string): boolean {
  return v === "мотоцикл" || v === "автомашин" || v === "мопед";
}

/** Энэ хэрэгсэлд хамаарах баримтууд, оруулах дарааллаар */
export function docItems(v?: string): DocItem[] {
  const items: DocItem[] = [{ key: "photoUrl", label: "Цээж зураг", required: true }];
  if (v === "явган") return items;
  if (v === "дугуй") return [...items, { key: "carPhotoUrl", label: VEHICLE_PHOTO_LABEL.дугуй, required: false }];
  const strict = v === "мотоцикл" || v === "автомашин";
  return [
    ...items,
    { key: "licensePhotoUrl", label: "Жолооны үнэмлэх", required: true },
    { key: "carPhotoUrl", label: VEHICLE_PHOTO_LABEL[v ?? ""] ?? "Тээврийн хэрэгслийн зураг", required: true },
    { key: "plate", label: "Улсын дугаар", required: strict },
    { key: "licenseNo", label: "Үнэмлэхийн дугаар", required: strict },
    { key: "licenseClass", label: "Ангилал", required: false },
    { key: "licenseExpiry", label: "Хүчинтэй хугацаа", required: false },
  ];
}

/** Дутуу байгаа заавал баримтуудын нэр — хоосон бол баталгаажуулахад бэлэн */
export function missingDocs(v: string | undefined, docs: Partial<CourierDocs>): string[] {
  return docItems(v)
    .filter((d) => d.required && !docs[d.key]?.toString().trim())
    .map((d) => d.label);
}
