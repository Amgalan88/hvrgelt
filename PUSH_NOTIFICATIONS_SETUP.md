# hvrgelt — Push мэдэгдлийн тохиргоо

Апп хаалттай байсан ч утсанд мэдэгдэл очно (утсан дээр апп болгон суулгасан
бол хамгийн найдвартай, iPhone дээр заавал суулгана):

| Хэнд | Хэзээ | Хаанаас асаах |
|---|---|---|
| Захиалагч | үнэ тогтох, төлбөр орох, хүргэгч томилогдох, ачаа авах, хүргэгдэх, цуцлагдах | Тохиргоо → Мэдэгдэл |
| Оператор | шинэ захиалга ирэх бүрд | толгой хэсгийн 🔔 |
| Хүргэгч | ойр захиалгын санал, захиалга томилогдох | толгой хэсгийн 🔔 |
| Супер админ | шинэ хүргэгч баримтаа бүрэн оруулах | толгой хэсгийн 🔔 |

Сервер нь [api/notify.ts](api/notify.ts) — Vercel Function. Push хийхэд
автоматаар deploy болно, **Supabase CLI хэрэггүй**.

---

## 1. Migration (нэг удаа)

Supabase Dashboard → SQL Editor: [09.sql](supabase/migrations/09.sql),
дараа нь [10.sql](supabase/migrations/10.sql).

## 2. VAPID түлхүүр

```
npx web-push generate-vapid-keys
```

Нэг **хос** түлхүүр гарна. Өмнө нь энэ репод бичигдсэн хуучин түлхүүрийг
бүү ашигла — шинээр үүсгэнэ.

## 3. Vercel → Settings → Environment Variables (Production)

| Key | Утга |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | Public Key (нээлттэй — апп-д ордог) |
| `VAPID_PRIVATE_KEY` | Private Key — **нууц** |
| `WEBHOOK_SECRET` | Өөрөө зохиосон урт санамсаргүй үг (доор) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (төлбөрт нэмсэн бол дахин хэрэггүй) |

`WEBHOOK_SECRET` үүсгэх (PowerShell):

```
[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
```

Дараа нь **Redeploy**.

> ⚠️ Private Key, `WEBHOOK_SECRET`-ийг кодонд, энэ файлд, чатанд **бүү бичээрэй**
> — repo нийтэд нээлттэй. Нууц түлхүүрт `VITE_` угтвар бүү тавь.

## 4. Supabase Database Webhook (захиалгын мэдэгдэлд)

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

| Талбар | Утга |
|---|---|
| Name | `order-notify` |
| Table | `orders` |
| Events | **Insert** ба **Update** |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://www.hvrgelt.mn/api/notify?source=db` (www-тэй) |
| HTTP Headers | `x-webhook-secret` = Vercel-д тавьсан `WEBHOOK_SECRET`-тэй яг ижил |

Хуучин `send-order-notification` Edge Function рүү заасан webhook байвал устгана.

**«schema "supabase_functions" does not exist» алдаа гарвал** — цонхоор биш,
[supabase/migrations/21.sql](supabase/migrations/21.sql)-ийг SQL Editor дээр
ажиллуулна (`ЭНД_НУУЦ_УТГАА`-г `WEBHOOK_SECRET`-ээр сольж). Үр дүн нь ижил.

## 5. Туршиж үзэх

1. Оператор, хүргэгч, супер админ — 🔔 дарж зөвшөөрнө. Захиалагч — Тохиргоо → Мэдэгдэл.
2. Захиалга өгөхөд оператор «Шинэ захиалга ирлээ» авна.
3. Төлбөр ормогц ажилд гарсан ойрын хүргэгч «Шинэ санал · ₮…» авна.
4. Шинэ хүргэгч баримтаа бүрэн оруулахад супер админ «Шинэ хүргэгч шалгалт хүлээж байна» авна.

Ажиллахгүй бол:
- Supabase → Integrations → Database Webhooks → `order-notify` → сүүлийн дуудлагууд
  (SQL-ээр үүсгэсэн бол: `select status_code, content::text from net._http_response order by created desc limit 5;`). **401** бол
  `x-webhook-secret` буруу, **501** бол Vercel-ийн түлхүүр дутуу.
- Vercel → Deployments → сүүлийнх → Functions → `api/notify` log.

## Push хэрэггүй бол

`VITE_VAPID_PUBLIC_KEY` тохируулаагүй бол мэдэгдлийн товчнууд нуугдаж, апп
ердийнхөөрөө ажиллана. Апп нээлттэй үед дуут дохио, жагсаалтын шинэчлэлт
мэдэгдэлгүйгээр ч ажиллана.
