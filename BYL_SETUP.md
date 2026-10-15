# Онлайн төлбөр (Byl — QPay, карт) холбох

Төлбөрийн сервер код нь [api/payments.ts](api/payments.ts) — Vercel Function.
GitHub руу push хийхэд Vercel өөрөө deploy хийнэ. **Supabase CLI, deploy
команд шаардлагагүй.**

## Яагаад VITE_ биш вэ

`VITE_` гэж эхэлсэн хувьсагч хөтчийн JavaScript дотор ил бичигддэг —
hvrgelt.mn-д орсон хэн ч уншина. Byl-ийн токэн тэнд байвал хүн бүр танай
нэрээр нэхэмжлэх үүсгэж, Signing secret байвал хуурамч "төлөгдлөө"
мэдэгдэл илгээж үнэгүй хүргэлт авч чадна. Доорх 4 хувьсагчийг **VITE_
угтваргүй** нэрлэвэл Vercel зөвхөн серверт өгнө, хөтөч рүү хэзээ ч очихгүй.

## Тохируулах — 3 алхам

### 1. Byl dashboard

- **API токэн** → шинэ токэн үүсгэж хуулна
- **Project ID** — хөтчийн хаягийн мөрөнд `.../projects/<тоо>/...`
- **Webhook → Endpoint нэмэх**
  - URL: `https://hvrgelt.mn/api/payments?action=webhook`
  - Event: `invoice.paid`
  - Хадгалсны дараа **Signing secret**-ийг хуулна

### 2. Vercel → Settings → Environment Variables

| Key | Value |
|---|---|
| `BYL_API_TOKEN` | Byl-ийн API токэн |
| `BYL_PROJECT_ID` | Byl-ийн Project ID |
| `BYL_WEBHOOK_SECRET` | Webhook-ийн Signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

Environments: **Production** (туршихдаа Preview-д ч нэмж болно).

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` нь DB-ийн бүх эрхтэй түлхүүр — нэрийг нь
> яг ингэж (VITE_-гүй) бичнэ. Эдгээрийг кодонд, чатанд бүү бичээрэй.

### 3. Redeploy

Deployments → сүүлийн deployment → `···` → **Redeploy**.

## Шалгах

1. Энгийн үйлчлүүлэгчийн бүртгэлээр хамгийн бага үнэтэй захиалга хийнэ.
2. Төлбөрийн шатанд **"₮… төлөх"** товч гарах ёстой. Дансны мэдээлэл
   гарсаар байвал 4 хувьсагчийн аль нэг дутуу эсвэл redeploy хийгээгүй.
3. Byl хуудсанд QPay-ээр төлөөд апп руу буцна → "Хүргэгч хайж байна".
4. Byl → Webhook → endpoint-ийн хуудсанд **2xx** гарвал зөв. **401** бол
   `BYL_WEBHOOK_SECRET` буруу.

## Урсгал

1. Апп `/api/payments?action=create` дуудна → сервер дүнг DB-ээс уншиж
   Byl дээр нэхэмжлэх үүсгэнэ (нэг захиалгад 23 цагт нэг нэхэмжлэх).
2. Үйлчлүүлэгч Byl-ийн хуудсанд QPay эсвэл картаар төлнө.
3. Byl `invoice.paid` webhook илгээнэ → сервер `Byl-Signature`-ийг шалгаж
   захиалгыг "Хүргэгч хайж байна" болгоно → ойрын 4 хүргэгчид санал очно.
4. Webhook хоцорсон ч апп руу буцаж ирэхэд сервер Byl-ээс өөрөө асууна.

## QPay шууд (Byl-гүй) бол

Byl-ийн 3 хувьсагчийн оронд `QPAY_USERNAME`, `QPAY_PASSWORD`,
`QPAY_INVOICE_CODE` нэмнэ (+ `SUPABASE_SERVICE_ROLE_KEY`). Апп QR ба
банкуудын товчийг харуулна. Аль нэгийг нь тохируулаагүй бол апп дансаар
шилжүүлэх горимд ажиллана.
