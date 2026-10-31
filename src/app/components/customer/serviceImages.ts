// Үйлчилгээний картын зураг. src хоосон бол одоогийн icon харагдана.
// Файл оруулахдаа public/services/ дотор webp (≥144px, 72px слотод 2×) тавиад src-г бөглөнө.
//
// Хэрэгтэй зураг:
//   goods.webp         — жижиг илгээмж хүргэж буй мотоцикл
//   goods-heavy.webp   — хүнд ачаа ачсан портер
//   truck-2t.webp      — 2 тонн хүртэлх ачааны машин
//   truck-big.webp     — 2 тонноос дээш том ачааны машин
//   kids.webp          — хүүхэд хүргэх суудлын машин
//   crane.webp         — крантай машин
//   vacuum.webp        — бохир соруулах машин
//   excavator.webp     — экскаватор
//   bobcat.webp        — бобкат

export interface ServiceCardImage {
  /** Жишээ: "/services/goods.webp". null бол icon. */
  src: string | null;
  alt: string;
}

export const SERVICE_CARD_IMAGES: Record<string, ServiceCardImage> = {
  goods: { src: null, alt: "Жижиг илгээмж хүргэж буй мотоцикл" },
  "goods-heavy": { src: null, alt: "Хүнд ачаа ачсан портер" },
  "truck-2t": { src: null, alt: "2 тонн хүртэлх ачааны машин" },
  "truck-big": { src: null, alt: "2 тонноос дээш том ачааны машин" },
  kids: { src: null, alt: "Хүүхэд хүргэх суудлын машин" },
  crane: { src: null, alt: "Крантай машин" },
  vacuum: { src: null, alt: "Бохир соруулах машин" },
  excavator: { src: null, alt: "Экскаватор" },
  bobcat: { src: null, alt: "Бобкат" },
};

export function serviceCardImage(id?: string): ServiceCardImage | undefined {
  if (!id) return undefined;
  return SERVICE_CARD_IMAGES[id];
}
