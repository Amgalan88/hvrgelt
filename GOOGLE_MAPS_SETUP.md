# Google Maps тохируулах

Тохируулаагүй үед апп OpenStreetMap (үнэгүй) газрын зураг ашиглана.
Google түлхүүр нэмэхэд газрын зураг автоматаар Google болно — код өөрчлөх
шаардлагагүй. Түлхүүр буруу, эсвэл billing идэвхгүй бол апп өөрөө
OpenStreetMap руу буцна, газрын зураг хоосон харагдахгүй.

Ашиглагдах API: **Maps JavaScript API** (газрын зураг ачаалах бүрт 1 event).
Сар бүр 10,000 ачаалалт үнэгүй, түүнээс хэтэрвэл 1,000 тутам $7.
Навигацийн товч (хүргэгчид чиглэл) Google Maps-ийн нийтийн холбоос тул
түлхүүр, төлбөр шаардахгүй.

## 1. Төсөл ба billing

1. https://console.cloud.google.com → дээд талын төсөл сонгогч → **New project**
   → нэр: `hvrgelt`
2. Зүүн цэс → **Billing** → billing account холбох (Visa/Mastercard карт).
   Карт холбоогүй бол газрын зураг ачаалагдахгүй.

## 2. API идэвхжүүлэх

**APIs & Services → Library** → `Maps JavaScript API` хайгаад **Enable**.

## 3. Түлхүүр үүсгэж хязгаарлах

1. **APIs & Services → Credentials → Create credentials → API key**
2. Үүссэн түлхүүр дээр дарж **Application restrictions → Websites**:
   ```
   https://hvrgelt.mn/*
   https://*.hvrgelt.mn/*
   https://*.vercel.app/*
   http://localhost:5173/*
   ```
3. **API restrictions → Restrict key → Maps JavaScript API** → Save

Хязгаарлаагүй түлхүүрийг бусад сайт хуулж ашиглахад төлбөр таны дансанд бичигдэнэ.

## 4. Зардлаа хязгаарлах (зөвлөмж)

- **Billing → Budgets & alerts** → сарын төсөв (жишээ нь $10) ба имэйл мэдэгдэл
- **APIs & Services → Maps JavaScript API → Quotas** → өдрийн хязгаар (жишээ нь 1,000)

## 5. Vercel дээр нэмэх

Vercel → төсөл → **Settings → Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | `AIza...` (3-р алхмын түлхүүр) | Production, Preview |

Дараа нь **Deployments → сүүлийн deployment → ··· → Redeploy**. Vite нь
хувьсагчийг build үед шингээдэг тул redeploy заавал хийнэ.

Локал дээр турших бол `.env`-д `VITE_GOOGLE_MAPS_API_KEY=AIza...` нэмээд
`npm run dev`-ийг дахин асаана.

## Шалгах

Захиалгын "Газрын зураг" товч дарахад Google-ийн газрын зураг (баруун доод
буланд Google лого) гарвал ажиллаж байна. OpenStreetMap гарсаар байвал
хөтчийн Console-д `InvalidKeyMapError`, `ApiNotActivatedMapError`,
`BillingNotEnabledMapError`, `RefererNotAllowedMapError` аль нь гарч байгааг харна —
нэр нь аль алхам дутуу байгааг заана.
