// Зураг хавсаргах туслах — Cloudinary тохируулсан бол тийш upload хийнэ,
// үгүй бол зургийг жижигрүүлж data URL болгоно (DB-ийн text баганад багтана).

import { cloudinaryConfigured, uploadToCloudinary } from "./cloudinary";

const MAX_SIDE = 900;
const QUALITY = 0.72;

/** Зургийг MAX_SIDE-д багтаан jpeg data URL болгоно */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Зургийг уншиж чадсангүй."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Зургийн формат буруу байна."));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Зураг боловсруулах боломжгүй байна."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Зургийг хадгалж URL буцаана.
 * Cloudinary тохируулсан бол тийш, эс бөгөөс шахсан data URL.
 */
export async function storePhoto(file: File): Promise<string> {
  if (cloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(file);
    } catch {
      // Upload амжилтгүй — доорх data URL рүү шилжинэ
    }
  }
  return compressImage(file);
}
