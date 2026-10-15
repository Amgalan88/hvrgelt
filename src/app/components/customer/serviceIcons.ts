import { Package, Luggage, Truck, Container, Baby, Construction, Droplets, Tractor, Forklift, type LucideIcon } from "lucide-react";

/** Үйлчилгээ бүрийн icon — апп даяар нэг хэв маяг (emoji-ийн оронд) */
export const SERVICE_ICON: Record<string, LucideIcon> = {
  goods: Package,
  "goods-heavy": Luggage,
  "truck-2t": Truck,
  "truck-big": Container,
  kids: Baby,
  crane: Construction,
  vacuum: Droplets,
  excavator: Tractor,
  bobcat: Forklift,
};

export function serviceIcon(id?: string): LucideIcon {
  return (id && SERVICE_ICON[id]) || Package;
}
