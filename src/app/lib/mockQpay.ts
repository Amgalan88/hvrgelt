// Туршилтын QPay.
//
// Жинхэнэ QPay гэрээ, түлхүүр ирэхээс өмнө төлбөрийн урсгалыг бүтнээр
// нь турших зориулалттай. QPay-ийн invoice хариуны бүтцийг (invoice_id,
// qr_text, qr_image, urls[] банкуудын жагсаалт) дуурайдаг тул жинхэнэ
// QPay холбогдоход зөвхөн эх үүсвэр нь солигдоно — дэлгэц хэвээр.
//
// Хэзээ идэвхжих вэ (App.tsx-ээс шийдэгдэнэ):
//   • Супер админ "Role-оор үзэх"-ээр үйлчлүүлэгчийн дэлгэц рүү орсон үед
//   • .env-д VITE_PAYMENT_PROVIDER=mock гэж тавьсан үед
// Жинхэнэ үйлчлүүлэгчид харагдахгүй.
//
// ⚠️ QR код нь санамсаргүй хээ — банкны апп-аар уншуулах боломжгүй.

/** QPay-ийн urls[] элементтэй ижил бүтэцтэй */
export interface QpayBank {
  name: string;
  description?: string;
  logo?: string;
  link: string;
}

export interface MockInvoice {
  invoiceId: string;
  qrText: string;
  qrImage: string;
  banks: QpayBank[];
}

/** QPay-ийн дэлгэц дээр гардаг банкуудын жагсаалт (туршилтын холбоостой) */
const BANK_NAMES = [
  "Хаан банк",
  "Голомт банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Хас банк",
  "Капитрон банк",
  "Богд банк",
  "М банк",
];

/** Тогтмол үртэй санамсаргүй тоо — нэг нэхэмжлэх үргэлж ижил QR-тай байна */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** QR шиг харагдах SVG — 3 булангийн хүрээ + санамсаргүй модуль */
function pseudoQrSvg(seed: string): string {
  const N = 25;
  const rnd = seededRandom(seed);
  const cells: string[] = [];
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (rnd() < 0.48) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7"/>` +
    `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges">` +
    `<rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/>` +
    `<g fill="#111">${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}${cells.join("")}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Туршилтын нэхэмжлэх үүсгэнэ — QPay /v2/invoice-ийн хариутай ижил хэлбэр */
export function createMockInvoice(orderId: string, amount: number): MockInvoice {
  const rnd = seededRandom(orderId + Date.now());
  const invoiceId = "TEST-" + Math.floor(rnd() * 1e8).toString().padStart(8, "0");
  const qrText = `TESTQPAY|${invoiceId}|${orderId}|${amount}`;
  return {
    invoiceId,
    qrText,
    qrImage: pseudoQrSvg(qrText),
    banks: BANK_NAMES.map((name) => ({
      name,
      description: `${name} — туршилт`,
      link: `test-qpay://pay?invoice=${invoiceId}`,
    })),
  };
}
