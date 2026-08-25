// Утасны дугаарыг DB-д хадгалсантай нэг стандартад оруулна.
// Өөр төхөөрөмж дээр contact-аас +976 кодтой эсвэл 0-ээр эхэлсэн хэлбэрээр
// автоматаар бөглөгдсөн ч ижил хэрэглэгч гэж танигдахын тулд шаардлагатай.
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 8 && digits.startsWith("976")) digits = digits.slice(3);
  if (digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw).length === 8;
}
