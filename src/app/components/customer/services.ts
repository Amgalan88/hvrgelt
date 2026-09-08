// Үндсэн үйлчилгээнүүд — хэрэглэгчийн эхний дэлгэц дээр харагдана.
// Шинэ үйлчилгээ нэмэхдээ энэ жагсаалтад нэг мөр нэмэхэд хангалттай.
// `id` нь DB-д (orders.service_id) хадгалагдана — нэг удаа өгсөн id-г бүү өөрчил.

export interface Service {
  id: string;
  label: string;
  emoji: string;
  desc: string;      // товч тайлбар — картан дээр харагдана
  notePlaceholder: string; // тухайн үйлчилгээнд тохирсон тэмдэглэлийн placeholder
}

export const SERVICES: Service[] = [
  {
    id: "goods",
    label: "Бараа хүргэлт",
    emoji: "📦",
    desc: "Илгээмж, баглаа боодол хот дотор",
    notePlaceholder: "Юу хүргэх вэ? — хэмжээ, жин, эмзэг эсэх...",
  },
  {
    id: "market",
    label: "Захаас бараа авах",
    emoji: "🛒",
    desc: "Зах, худалдааны төвөөс худалдан авч хүргэнэ",
    notePlaceholder: "Ямар бараа, хэдэн ширхэг, ойролцоо үнэ...",
  },
  {
    id: "porter",
    label: "Портер ачигчтай",
    emoji: "🚚",
    desc: "Ачигч ажилтантай портер машин",
    notePlaceholder: "Хэдэн ачигч, ямар ачаа, давхар лифттэй эсэх...",
  },
  {
    id: "crane",
    label: "Крантай машин",
    emoji: "🏗️",
    desc: "Хүнд ачаа өргөх, буулгах",
    notePlaceholder: "Ачааны жин, өндөр, ажлын хугацаа...",
  },
  {
    id: "kids",
    label: "Хүүхэд хүргэлт",
    emoji: "🧒",
    desc: "Хүүхдийг сургууль, гэрт нь хүргэнэ",
    notePlaceholder: "Хүүхдийн нас, хэн хүлээж авах, утасны дугаар...",
  },
];

export function serviceById(id?: string): Service | undefined {
  return id ? SERVICES.find((s) => s.id === id) : undefined;
}
