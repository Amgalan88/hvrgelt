const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export function cloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary тохиргоо дутуу байна (.env файлд VITE_CLOUDINARY_CLOUD_NAME болон VITE_CLOUDINARY_UPLOAD_PRESET оруулна уу).");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Зураг upload хийхэд алдаа гарлаа.");
  const data = await res.json();
  return data.secure_url as string;
}
