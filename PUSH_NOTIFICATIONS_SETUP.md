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

```
supabase secrets set VAPID_PUBLIC_KEY=BEEW8WbGPam7qgeP-aMEkRvPGxdTsgJk6IA13rW_r2tPnA9InCpHvETTZAlfE8RSKzVKnWr3dn-5zPPHpakPlDY
supabase secrets set VAPID_PRIVATE_KEY=lte6MUKdeVfD_ZzbXFUWa9BAtAN7TBi_huiKsVikE_k
supabase secrets set VAPID_SUBJECT=mailto:85205258@hvrgelt.mn
supabase secrets set WEBHOOK_SECRET=5f3838a199359058cccfd656b3101599fb7caf31b3c50a03
```

> ⚠️ `VAPID_PRIVATE_KEY` болон `WEBHOOK_SECRET`-г хэнтэй ч бүү хуваалц. Дээрх
> утгууд энэ session дээр зөвхөн танд зориулж үүсгэсэн (эсвэл өөрөө шинээр
> `npx web-push generate-vapid-keys` ажиллуулж солиж болно).

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

## Хэрэв push notification хэрэггүй болвол

Тохиргоог алгасаж болно — `.env`-д `VITE_VAPID_PUBLIC_KEY` байхгүй бол Settings
хуудсан дээрх "Мэдэгдэл" хэсэг болон operator/courier header-ийн хонх дүрс бүгд
нуугдана, апп бусад бүх зүйл хэвийн ажиллана.
