export type OrderStatus =
  | "шинэ"
  | "үнэ батлах"
  | "томилогдсон"
  | "авсан"
  | "хүргэгдсэн"
  | "цуцлагдсан";

export type UserRole = "customer" | "operator" | "courier" | "superadmin";

export interface Order {
  id: string;
  fromAddress: string;
  toAddress: string;
  fromDetail: string;
  toDetail: string;
  packageNote: string;
  price: number;
  distance: number;
  status: OrderStatus;
  createdAt: string;
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
