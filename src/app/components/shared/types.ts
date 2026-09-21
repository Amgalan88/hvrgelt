export type OrderStatus =
  | "шинэ"
  | "үнэ батлах"          // оператор үнэ тогтоов — үйлчлүүлэгч батална
  | "төлбөр хүлээж байна" // үнэ батлагдав — QR-аар төлнө
  | "жолооч хайж байна"   // төлбөр орлоо — жолооч хуваарилж байна
  | "томилогдсон"
  | "авсан"
  | "хүргэгдсэн"
  | "цуцлагдсан";

/** Захиалга идэвхтэй (дуусаагүй) эсэх */
export const ACTIVE_STATUSES: OrderStatus[] = [
  "шинэ",
  "үнэ батлах",
  "төлбөр хүлээж байна",
  "жолооч хайж байна",
  "томилогдсон",
  "авсан",
];

export type PaymentStatus = "хүлээгдэж байна" | "төлөгдсөн" | "буцаагдсан";

export type UserRole = "customer" | "operator" | "courier" | "superadmin" | "partner";

/** Сагсанд хийсэн партнёрын бараа */
export interface BasketItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  fromAddress: string;
  toAddress: string;
  fromDetail: string;
  toDetail: string;
  packageNote: string;
  serviceId?: string;     // services.ts — үндсэн үйлчилгээ
  subServiceId?: string;  // services.ts — дэд төрөл
  cargoPhotoUrl?: string; // ачааны гадна зураг
  weightKg?: number;
  fragile?: boolean;      // хагарах аюултай
  urgent?: boolean;       // онцгой яаралтай
  price: number;
  distance: number;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;      // зөвхөн цаг — HH:MM
  insertedAt?: string;    // DB-ийн бүртгэсэн бүтэн огноо (timestamptz)
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  eta?: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  basket?: BasketItem[];
  basketTotal?: number;
  partnerId?: string;
}

export interface CourierUser {
  id: string;
  name: string;
  phone: string;
  vehicle: "мотоцикл" | "автомашин" | "дугуй" | "мопед";
  available: boolean;
  rating: number;
  totalDeliveries: number;
  todayDeliveries: number;
  verified?: boolean;
}

/** Жолоочийн баримт бичиг — үйлчлүүлэгчид харагдах 5 мэдээлэл */
export interface CourierDocs {
  photoUrl?: string;
  licensePhotoUrl?: string;
  licenseNo?: string;
  licenseClass?: string;
  licenseExpiry?: string;
  carPhotoUrl?: string;
  plate?: string;
  verified?: boolean;
  verifiedAt?: string;
}

export interface OperatorUser {
  id: string;
  name: string;
  code: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
}

/** Партнёрын бараа — сагсанд ордог */
export interface PartnerProduct {
  id: string;
  partnerId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string;
  inStock: boolean;
  sort: number;
}

export interface OrderRating {
  orderId: string;
  courierId?: string;
  customerId?: string;
  score: number;
  comment?: string;
  createdAt: string;
}
