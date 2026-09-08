// Захиалгын өдрийн тайланг Excel-д нээгддэг CSV болгон татах.
//
// CSV-г UTF-8 BOM-той бичнэ (Excel кирилл үсгийг зөв уншина), эхний мөрөнд
// `sep=,` заавар тавина — ингэснээр Windows-ийн бүсийн тохиргооноос үл
// хамааран Excel баганад зөв салгаж нээнэ.

import type { Order } from "../components/shared/types";
import { serviceById } from "../components/customer/services";

/** Локал цагаар YYYY-MM-DD */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayYmd(): string {
  return ymd(new Date());
}

/** Тухайн өдөр (локал цагаар) үүссэн захиалгууд — хуучнаас шинэ рүү */
export function ordersOnDate(orders: Order[], date: string): Order[] {
  return orders
    .filter((o) => o.insertedAt && ymd(new Date(o.insertedAt)) === date)
    .sort((a, b) => (a.insertedAt! < b.insertedAt! ? -1 : 1));
}

const COLUMNS: { header: string; value: (o: Order, i: number) => string | number }[] = [
  { header: "№",                  value: (_o, i) => i + 1 },
  { header: "Захиалгын дугаар",   value: (o) => o.id },
  { header: "Огноо",              value: (o) => (o.insertedAt ? ymd(new Date(o.insertedAt)) : "") },
  { header: "Цаг",                value: (o) => o.createdAt },
  { header: "Үйлчилгээ",          value: (o) => serviceById(o.serviceId)?.label ?? "" },
  { header: "Авах хаяг",          value: (o) => o.fromAddress },
  { header: "Авах дэлгэрэнгүй",   value: (o) => (o.fromDetail === o.fromAddress ? "" : o.fromDetail) },
  { header: "Хүргэх хаяг",        value: (o) => o.toAddress },
  { header: "Хүргэх дэлгэрэнгүй", value: (o) => (o.toDetail === o.toAddress ? "" : o.toDetail) },
  { header: "Тэмдэглэл",          value: (o) => (o.packageNote === "Тэмдэглэлгүй" ? "" : o.packageNote) },
  { header: "Захиалагч",          value: (o) => o.customerName },
  { header: "Захиалагчийн утас",  value: (o) => o.customerPhone },
  { header: "Хүргэгч",            value: (o) => o.courierName ?? "" },
  { header: "Хүргэгчийн утас",    value: (o) => o.courierPhone ?? "" },
  { header: "Үнэ",                value: (o) => o.price },
  { header: "Статус",             value: (o) => o.status },
];

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(orders: Order[]): string {
  const head = COLUMNS.map((c) => csvCell(c.header)).join(",");
  const rows = orders.map((o, i) => COLUMNS.map((c) => csvCell(c.value(o, i))).join(","));
  const total = orders.reduce((sum, o) => (o.status === "цуцлагдсан" ? sum : sum + o.price), 0);
  const totalRow = COLUMNS.map((c) =>
    c.header === "Статус" ? "" : c.header === "Үнэ" ? total : c.header === "Захиалгын дугаар" ? "НИЙТ" : "",
  ).join(",");
  return ["sep=,", head, ...rows, totalRow].join("\r\n");
}

/** Тайлангийн нийлбэр үзүүлэлтүүд — цонхонд харуулна */
export function summarize(orders: Order[]) {
  return {
    total: orders.length,
    delivered: orders.filter((o) => o.status === "хүргэгдсэн").length,
    cancelled: orders.filter((o) => o.status === "цуцлагдсан").length,
    revenue: orders.reduce((sum, o) => (o.status === "цуцлагдсан" ? sum : sum + o.price), 0),
  };
}

export function downloadOrdersCsv(orders: Order[], date: string) {
  const blob = new Blob(["﻿" + buildCsv(orders)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hvrgelt-zahialga-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
