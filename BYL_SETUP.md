# Byl-ээр онлайн төлбөр (QPay, карт) холбох

[Byl](https://byl.mn) нь QPay болон банкны картыг нэг төлбөрийн хуудсанд
нэгтгэдэг. QPay-тэй шууд merchant гэрээ хийх шаардлагагүй.

## Урсгал

1. Захиалга "Төлбөрөө хийнэ үү" шатанд ирэхэд апп `create-payment` функцийг
   дуудна → функц Byl дээр нэхэмжлэх үүсгэнэ (дүнг DB-ээс уншина, апп-аас биш).
2. Үйлчлүүлэгч **"₮7,000 төлөх"** товч дарж Byl-ийн хуудсанд QPay эсвэл
   картаар төлнө.
3. Byl `invoice.paid` webhook-ийг `payment-webhook` руу илгээнэ. Функц
   `Byl-Signature` гарын үсгийг шалгаад захиалгыг "Хүргэгч хайж байна"
   болгоно. Апп-ын дэлгэц өөрөө шинэчлэгдэнэ.
4. Webhook хоцорсон ч үйлчлүүлэгч апп руу буцаж ирэхэд (эсвэл "Төлбөрөө
   шалгах" дарахад) сервер Byl-ээс нэхэмжлэхийн төлөвийг өөрөө асууж
   баталгаажуулна.

Нэг захиалгад 23 цагийн дотор ижил дүнтэй нэхэмжлэх дахин үүсгэхгүй.

## Тохируулах

### 1. Byl dashboard

- **API токэн** → шинэ токэн үүсгээд хуулж авна.
- **Project ID** — хөтчийн хаягийн мөрөнд `byl.mn/.../projects/<ID>/...`
  гэж харагдах тоо.
- **Webhook → Endpoint нэмэх**:
  - URL: `https://vjxpgjzlcryzlfwzrpwx.supabase.co/functions/v1/payment-webhook`
  - Event: `invoice.paid`
  - Хадгалсны дараа endpoint-ийн хуудаснаас **Signing secret**-ийг хуулна.

### 2. Supabase secrets

```
supabase secrets set PAYMENT_PROVIDER=byl
supabase secrets set BYL_API_TOKEN=<API токэн>
supabase secrets set BYL_PROJECT_ID=<Project ID>
supabase secrets set BYL_WEBHOOK_SECRET=<Signing secret>
```

> ⚠️ Эдгээрийг кодонд, энэ файлд, чатанд **бүү бичээрэй** — repo нийтэд нээлттэй.

### 3. Функцуудыг deploy хийх

```
supabase functions deploy create-payment --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
```

### 4. Vercel

Settings → Environment Variables → `VITE_PAYMENT_PROVIDER` = `byl` →
Deployments → Redeploy.

## Шалгах

1. Бага дүнтэй (Byl-ийн доод хэмжээ ₮10) жинхэнэ захиалга хийнэ.
2. "₮... төлөх" → Byl хуудсанд төлнө → апп руу буцна.
3. Захиалга "Хүргэгч хайж байна" болох ёстой.
4. Byl dashboard → Webhook → endpoint-ийн хуудсанд хүргэлт **2xx** гэж
   харагдах ёстой. **401** бол Signing secret буруу.

Туршилт хийхдээ супер админ "Role-оор үзэх"-ээр үйлчлүүлэгч болж орвол
жинхэнэ Byl биш **туршилтын QPay** гарна — жинхэнэ төлбөрийг шалгахын тулд
ердийн үйлчлүүлэгчийн бүртгэлээр нэвтэрнэ.
