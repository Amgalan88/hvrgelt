# hvrgelt — Push мэдэгдлийн тохиргооны заавар

Гурван талд push мэдэгдэл очно (апп хаалттай байсан ч ажиллана — Android дээр
PWA байдлаар суулгасан бол хамгийн найдвартай):

- **Захиалагч** — үнэ тогтоогдох, хүргэгч томилогдох, ачаа авах, хүргэгдэх,
  цуцлагдах үед (Тохиргоо → Мэдэгдэл-ээс идэвхжүүлнэ)
- **Оператор** — шинэ захиалга ирэх бүрд (header дэх хонх дүрсээр идэвхжүүлнэ)
- **Хүргэгч** — өөрт нь захиалга томилогдох үед (header дэх хонх дүрсээр идэвхжүүлнэ)

Клиент талын код бүгд бэлэн. Сервер тал (Supabase Edge Function) нь таны
Supabase аккаунтаас deploy хийгдэх ёстой тул доорх алхмуудыг **та өөрөө** нэг
удаа хийх шаардлагатай.

---

## 1. Migration ажиллуулах

Supabase Dashboard → SQL Editor:
1. [supabase_migration_9.sql](supabase_migration_9.sql) — `push_subscriptions` хүснэгт үүснэ
2. [supabase_migration_10.sql](supabase_migration_10.sql) — хүснэгтийг operator/courier-т ч ашиглах боломжтой болгоно (role багана нэмнэ)

Хоёуланг дараалуулж Run дарна.

## 2. .env — public түлхүүр (аль хэдийн орсон)

`VITE_VAPID_PUBLIC_KEY` нь `.env`-д аль хэдийн орсон байгаа. Энэ бол public
түлхүүр тул client bundle-д орсон ч асуудалгүй.

## 3. Supabase CLI суулгах, нэвтрэх, project холбох

```
npm install -g supabase
supabase login
supabase link --project-ref <таны-project-ref>
```

`<таны-project-ref>` нь Supabase Dashboard → Project Settings → General дээрх
"Reference ID" (эсвэл `.env`-ийн `VITE_SUPABASE_URL`-ийн `https://<ref>.supabase.co`
хэсэг).

## 4. Нууц түлхүүрүүдийг тохируулах

Түлхүүрээ **өөрийн компьютер дээр** шинээр үүсгэнэ:

```
npx web-push generate-vapid-keys
```

Гарсан хоёр түлхүүрийн **Public Key** нь `.env`-ийн `VITE_VAPID_PUBLIC_KEY`
болон Vercel-ийн Environment Variables-д, **Private Key** нь зөвхөн
Supabase secrets-д орно. `WEBHOOK_SECRET`-д санамсаргүй урт текст өгнө
(жишээ нь `npx -y uuid` эсвэл нууц үг үүсгэгч).

```
supabase secrets set VAPID_PUBLIC_KEY=<Public Key>
supabase secrets set VAPID_PRIVATE_KEY=<Private Key>
supabase secrets set VAPID_SUBJECT=mailto:info@hvrgelt.mn
supabase secrets set WEBHOOK_SECRET=<санамсаргүй урт текст>
```

> ⚠️ Private Key болон `WEBHOOK_SECRET`-ийг энэ файлд, кодонд, чатанд
> **бүү бичээрэй** — repo нийтэд нээлттэй. Өмнө нь энд бичигдсэн байсан
> түлхүүрүүдийг ашиглахгүй, заавал шинээр үүсгэнэ.

`SUPABASE_URL` болон `SUPABASE_SERVICE_ROLE_KEY`-г supabase secrets-ээр
тохируулах шаардлагагүй — Edge Function дотор автоматаар бэлэн байдаг.

## 5. Function deploy хийх

```
supabase functions deploy send-order-notification --no-verify-jwt
```

Амжилттай бол функцийн URL-г консол дээр харуулна:
`https://<ref>.supabase.co/functions/v1/send-order-notification`

## 6. Database Webhook үүсгэх

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

| Талбар | Утга |
|---|---|
| Name | `order-status-notify` |
| Table | `orders` |
| Events | **Insert** болон **Update** хоёуланг сонгоно (Insert — оператор мэдэгдэлд, Update — хүргэгч/захиалагч мэдэгдэлд хэрэгтэй) |
| Type | HTTP Request |
| Method | `POST` |
| URL | 5-р алхмын function URL |
| HTTP Headers | `x-webhook-secret` = `WEBHOOK_SECRET`-тэй ижил утга |

## 7. Туршиж үзэх

1. Оператороор нэвтэрч, header дэх хонх дүрс дээр дараад мэдэгдэл асаана.
2. Хэрэглэгчээр нэвтэрч, **Тохиргоо → Мэдэгдэл**-ийг асаана.
3. Хүргэгчээр нэвтэрч, header дэх хонх дүрсээр мэдэгдэл асаана.
4. Хэрэглэгчээр захиалга өгнө → **оператор** "Шинэ захиалга ирлээ" мэдэгдэл авах ёстой.
5. Оператор үнэ тогтоож хүргэгч томилно → **хүргэгч** "Танд шинэ ачаа томилогдлоо",
   **захиалагч** "Хүргэлтийн үнэ тогтлоо" мэдэгдэл авах ёстой (апп хаалттай байсан ч гэсэн).

Ажиллахгүй бол эхлээд Supabase Dashboard → Edge Functions → Logs-оос
`send-order-notification`-ийн алдааг шалгаарай.

---

## 8. Шинэ хүргэгчийн мэдэгдэл (супер админд) — Vercel

Хүргэгч баримтаа бүрэн оруулмагц супер админд «Шинэ хүргэгч шалгалт хүлээж
байна» гэж очно. Энэ нь Supabase биш, [api/notify.ts](api/notify.ts) (Vercel)
тул CLI хэрэггүй. Vercel → Settings → Environment Variables-д (VITE_-гүй):

| Key | Value |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | Public Key (апп-д ч хэрэгтэй — Production, Preview) |
| `VAPID_PRIVATE_KEY` | Private Key — **нууц** |
| `SUPABASE_SERVICE_ROLE_KEY` | (төлбөрт аль хэдийн нэмсэн бол дахин хэрэггүй) |

Redeploy хийсний дараа супер админ толгой хэсгийн 🔔 товчоор мэдэгдлээ
асаана. Апп нээлттэй үед мэдэгдэл тохируулаагүй ч дуут дохио гарч, «Хүргэгчид»
таб дээр тоо харагдана.

## Хэрэв push notification хэрэггүй болвол

Тохиргоог алгасаж болно — `.env`-д `VITE_VAPID_PUBLIC_KEY` байхгүй бол Settings
хуудсан дээрх "Мэдэгдэл" хэсэг болон operator/courier header-ийн хонх дүрс бүгд
нуугдана, апп бусад бүх зүйл хэвийн ажиллана.
