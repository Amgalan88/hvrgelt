// ⚠️ MOCK — хүргэгчийн баталгаажуулалтын мэдээллийг туршихад зориулсан
// түр өгөгдөл. Жинхэнэ өгөгдөл нь дараа нь couriers хүснэгтээс
// (license_photo, car_photo, plate, ...) ирнэ. Тэр үед энэ файлыг зөвхөн
// зураг байхгүй үеийн fallback болгон үлдээж болно.

export interface CourierProfile {
  photo: string;        // цээж зураг
  licenseImg: string;   // жолооны үнэмлэхийн зураг
  carImg: string;       // машины зураг
  plate: string;        // улсын дугаар
  phone: string;
  rating: number;
  deliveries: number;
  vehicle: string;
  licenseNo: string;
  licenseClass: string;
  licenseExpiry: string;
  experience: number;   // жил
}

function svgUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

/** Жолооны үнэмлэхийн mock зураг */
function licenseSvg(name: string, no: string, cls: string, expiry: string) {
  return svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" font-family="Inter, Arial, sans-serif">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="640" height="400" rx="28" fill="url(#g)"/>
      <rect x="0" y="0" width="640" height="74" rx="28" fill="#0b2565"/>
      <rect x="0" y="46" width="640" height="28" fill="#0b2565"/>
      <text x="32" y="46" fill="#fff" font-size="23" font-weight="700">ЖОЛООЧИЙН ҮНЭМЛЭХ</text>
      <text x="32" y="65" fill="#93c5fd" font-size="13">DRIVING LICENCE · MONGOLIA</text>
      <rect x="32" y="102" width="150" height="185" rx="12" fill="#ffffff22" stroke="#ffffff44"/>
      <circle cx="107" cy="168" r="38" fill="#ffffff55"/>
      <path d="M52 287c0-33 25-58 55-58s55 25 55 58z" fill="#ffffff55"/>
      <text x="206" y="122" fill="#93c5fd" font-size="13">Овог, нэр</text>
      <text x="206" y="148" fill="#fff" font-size="24" font-weight="700">${name}</text>
      <text x="206" y="184" fill="#93c5fd" font-size="13">Үнэмлэхийн дугаар</text>
      <text x="206" y="209" fill="#fff" font-size="21" font-family="monospace">${no}</text>
      <text x="206" y="245" fill="#93c5fd" font-size="13">Ангилал</text>
      <text x="206" y="270" fill="#fff" font-size="21" font-weight="700">${cls}</text>
      <text x="386" y="245" fill="#93c5fd" font-size="13">Хүчинтэй хугацаа</text>
      <text x="386" y="270" fill="#fff" font-size="21">${expiry}</text>
      <text x="32" y="336" fill="#ffffff88" font-size="13">Олгосон: Зам тээврийн хөгжлийн яам</text>
      <text x="32" y="362" fill="#fbbf2499" font-size="13" font-weight="700">MOCK — туршилтын өгөгдөл</text>
    </svg>`);
}

/** Машины mock зураг — улсын дугаартай */
function carSvg(plate: string, color: string, model: string) {
  return svgUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" font-family="Inter, Arial, sans-serif">
      <rect width="640" height="400" fill="#1f2937"/>
      <rect y="300" width="640" height="100" fill="#111827"/>
      <path d="M110 268h420l-26-74c-6-17-22-28-40-28H176c-18 0-34 11-40 28z" fill="${color}"/>
      <rect x="96" y="262" width="448" height="56" rx="22" fill="${color}"/>
      <path d="M196 176h108v58H172z" fill="#0f172a" opacity=".65"/>
      <path d="M336 176h100l30 58H336z" fill="#0f172a" opacity=".65"/>
      <circle cx="188" cy="318" r="42" fill="#0b1220"/><circle cx="188" cy="318" r="18" fill="#64748b"/>
      <circle cx="452" cy="318" r="42" fill="#0b1220"/><circle cx="452" cy="318" r="18" fill="#64748b"/>
      <rect x="248" y="330" width="144" height="46" rx="7" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
      <text x="320" y="363" fill="#0f172a" font-size="27" font-weight="700" font-family="monospace" text-anchor="middle">${plate}</text>
      <text x="32" y="52" fill="#e5e7eb" font-size="22" font-weight="700">${model}</text>
      <text x="32" y="76" fill="#fbbf2499" font-size="13" font-weight="700">MOCK — туршилтын өгөгдөл</text>
    </svg>`);
}

// Хүргэгч бүрт давтагдашгүй mock багц
const MOCKS = [
  { avatar: 12, plate: "1234 УБА", color: "#dc2626", model: "Toyota Prius 30", cls: "B", exp: "2029.04.18", rating: 4.9, deliveries: 312, veh: "автомашин", exper: 6 },
  { avatar: 33, plate: "5678 УНС", color: "#2563eb", model: "Honda Fit",       cls: "B", exp: "2028.11.02", rating: 4.7, deliveries: 184, veh: "автомашин", exper: 3 },
  { avatar: 51, plate: "9012 ДАР", color: "#16a34a", model: "Yamaha Nmax",     cls: "A", exp: "2030.07.25", rating: 5.0, deliveries: 421, veh: "мотоцикл",  exper: 8 },
  { avatar: 8,  plate: "3456 УБЕ", color: "#ea580c", model: "Hyundai Porter",  cls: "C", exp: "2027.09.14", rating: 4.6, deliveries: 96,  veh: "автомашин", exper: 2 },
  { avatar: 27, plate: "7890 ДБА", color: "#7c3aed", model: "Suzuki Address",  cls: "A", exp: "2029.01.30", rating: 4.8, deliveries: 245, veh: "мопед",     exper: 4 },
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Хүргэгчийн id/нэрээс тогтмол (давтагдах) mock профайл гаргана */
export function courierProfile(courierId: string, name: string, phone: string): CourierProfile {
  const m = MOCKS[hash(courierId || name) % MOCKS.length];
  const licenseNo = `${String(hash(courierId + "l") % 90 + 10)}-${String(hash(name + "l") % 900000 + 100000)}`;
  return {
    photo: `https://i.pravatar.cc/400?img=${m.avatar}`,
    licenseImg: licenseSvg(name, licenseNo, m.cls, m.exp),
    carImg: carSvg(m.plate, m.color, m.model),
    plate: m.plate,
    phone,
    rating: m.rating,
    deliveries: m.deliveries,
    vehicle: m.veh,
    licenseNo,
    licenseClass: m.cls,
    licenseExpiry: m.exp,
    experience: m.exper,
  };
}
