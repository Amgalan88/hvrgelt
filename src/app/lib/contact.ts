// Холбоо барих мэдээлэл — нүүр хуудас, хууль эрх зүйн хуудас, апп доторх
// бүх газар эндээс уншина. Дугаар солих бол зөвхөн энд солино.

export interface ContactPhone {
  /** Харагдах хэлбэр */
  label: string;
  /** tel: холбоост ашиглах цэвэр дугаар */
  tel: string;
}

export const PHONES: ContactPhone[] = [
  { label: "9937-1961", tel: "99371961" },
  { label: "9637-1961", tel: "96371961" },
  { label: "8837-1961", tel: "88371961" },
];

export const WORK_HOURS = "08:00 – 22:00";

/** Нээлтийн өдөр — захиалга авч эхлэх (Супер админ «Захиалга авах»-ыг асаана) */
export const LAUNCH_DATE = "11 сарын 11";
export const LAUNCH_SHORT = "11.11";
export const CITY = "Дархан хот";

export const SOCIAL = {
  facebook: "https://www.facebook.com/hvrgelt.mn",
  instagram: "https://www.instagram.com/hvrgelt.mn",
};

export const SITE = "hvrgelt.mn";
/** Үйлчилгээ үзүүлэгч хуулийн этгээд (логон дээрх) */
export const COMPANY = "«Морьтой Бэрс» ХХК";
