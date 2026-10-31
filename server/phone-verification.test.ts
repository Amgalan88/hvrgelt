// Verify.MN mock горимын бүрэн урсгал: session → хүлээлт → VERIFIED → нэг удаагийн consume.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ATTEMPT_WINDOW_MS,
  consumeVerification,
  IP_MAX,
  MAX_ATTEMPTS,
  refreshVerification,
  startVerification,
  VERIFICATION_VALID_MINUTES,
  type PhoneDb,
  type VerificationRow,
} from "./phone-verification.js";
import { verifyMode } from "./verify-mn.js";

const saved = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function memoryDb(): PhoneDb & { rows: VerificationRow[]; seed: Map<string, { role: "customer" | "courier" | "operator" | "partner"; id: string }[]> } {
  const rows: VerificationRow[] = [];
  const phones = new Map<string, { role: "customer" | "courier" | "operator" | "partner"; id: string }[]>();
  const ips = new Map<string, { count: number; start: number }>();
  const db: PhoneDb & { rows: VerificationRow[] } = {
    rows,
    async accountsByPhone(phone) {
      return phones.get(phone) ?? [];
    },
    async countRecent(phone, since) {
      return rows.filter((r) => r.phone === phone && r.createdAt >= since).length;
    },
    async insert(row) {
      rows.push(row);
    },
    async get(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async markVerified(id, at) {
      const row = rows.find((r) => r.id === id);
      if (row && !row.verifiedAt) row.verifiedAt = at;
    },
    async consume(id, phone, purpose, since, role) {
      const row = rows.find(
        (r) =>
          r.id === id &&
          r.phone === phone &&
          r.purpose === purpose &&
          !r.usedAt &&
          r.verifiedAt &&
          r.verifiedAt >= since &&
          (purpose !== "signup" || !role || r.role === role),
      );
      if (!row) return false;
      row.usedAt = new Date();
      return true;
    },
    async takeIpSlot(ip, windowMs, max) {
      const now = Date.now();
      const cur = ips.get(ip);
      if (!cur || now - cur.start >= windowMs) {
        ips.set(ip, { count: 1, start: now });
        return true;
      }
      if (cur.count >= max) return false;
      cur.count += 1;
      return true;
    },
  };
  return Object.assign(db, { seed: phones });
}

function mockEnv() {
  delete process.env.VERIFY_MN_API_KEY;
  process.env.VERIFY_MN_MOCK = "1";
  delete process.env.VERCEL_ENV;
  delete process.env.APP_URL;
}

test("mock горим production дээр асахгүй", () => {
  delete process.env.VERIFY_MN_API_KEY;
  process.env.VERIFY_MN_MOCK = "1";
  process.env.VERCEL_ENV = "production";
  assert.equal(verifyMode(), "off");
  delete process.env.VERCEL_ENV;
  assert.equal(verifyMode(), "mock");
  process.env.VERIFY_MN_API_KEY = "vrf_test";
  assert.equal(verifyMode(), "live");
});

test("mock урсгал: SMS-гүй 4 секундэд баталгаажиж, нэг удаа л зарцуулагдана", async () => {
  mockEnv();
  const db = memoryDb();
  const started = await startVerification(db, "+976 9911-2233", "signup", { role: "customer", ip: "203.0.113.5" });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  assert.equal(started.mock, true);
  assert.equal(started.shortcode, "144773");
  assert.match(started.code, /^\d{6}$/);
  assert.equal(db.rows[0].sessionId.startsWith("mock_"), true);
  assert.equal(started.id.length <= 64, true);

  assert.equal(await refreshVerification(db, started.id), "PENDING");

  const row = db.rows[0];
  row.createdAt = new Date(Date.now() - 5000);
  assert.equal(await refreshVerification(db, started.id), "VERIFIED");
  assert.ok(row.verifiedAt);

  const ok = await consumeVerification(db, started.id, "99112233", "signup", "customer");
  assert.equal(ok, true);
  assert.equal(await consumeVerification(db, started.id, "99112233", "signup", "customer"), false);
  assert.equal(await consumeVerification(db, started.id, "99112233", "reset"), false);
  assert.equal(await consumeVerification(db, started.id, "99112233", "signup", "courier"), false);
});

test("жинхэнэ цаг: mock session 4 секундийн дараа VERIFIED", async () => {
  mockEnv();
  const db = memoryDb();
  const started = await startVerification(db, "88112233", "signup", { role: "courier", ip: "203.0.113.9" });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  assert.equal(await refreshVerification(db, started.id), "PENDING");
  await new Promise((r) => setTimeout(r, 4500));
  assert.equal(await refreshVerification(db, started.id), "VERIFIED");
  assert.equal(await consumeVerification(db, started.id, "88112233", "signup", "courier"), true);
});

test("бүртгэлтэй дугаар, буруу урт, давтамж, IP, reset", async () => {
  mockEnv();
  const db = memoryDb();
  const seed = db.seed;
  seed.set("88001122", [{ role: "customer", id: "cu-1" }]);

  assert.equal((await startVerification(db, "88001122", "signup", { role: "customer", ip: "198.51.100.1" })).ok, false);
  const taken = await startVerification(db, "88001122", "signup", { role: "customer", ip: "198.51.100.1" });
  assert.equal(taken.ok, false);
  if (!taken.ok) assert.equal(taken.error, "phoneTaken");

  const bad = await startVerification(db, "123", "signup", { role: "customer", ip: "198.51.100.1" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.error, "badPhone");

  const missing = await startVerification(db, "87001122", "reset", { ip: "198.51.100.2" });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error, "noAccount");

  seed.set("87002233", [{ role: "operator", id: "op-1" }]);
  const staff = await startVerification(db, "87002233", "reset", { ip: "198.51.100.2" });
  assert.equal(staff.ok, false);
  if (!staff.ok) assert.equal(staff.error, "cantReset");

  const reset = await startVerification(db, "88 00-1122", "reset", { ip: "198.51.100.2" });
  assert.equal(reset.ok, true);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const r = await startVerification(db, "86001100", "signup", { role: "customer", ip: "198.51.100.3" });
    assert.equal(r.ok, true, `attempt ${i}`);
  }
  const limited = await startVerification(db, "86001100", "signup", { role: "customer", ip: "198.51.100.3" });
  assert.equal(limited.ok, false);
  if (!limited.ok) assert.equal(limited.error, "tooMany");

  let opened = 0;
  for (let n = 0; n < IP_MAX + 2; n++) {
    const phone = `85${String(n).padStart(6, "0")}`;
    const r = await startVerification(db, phone, "signup", { role: "customer", ip: "198.51.100.8" });
    if (r.ok) opened += 1;
  }
  assert.equal(opened, IP_MAX);

  const old = db.rows.find((r) => r.phone === "86001100");
  assert.ok(old);
  old!.createdAt = new Date(Date.now() - ATTEMPT_WINDOW_MS - 1000);
  // цонхноос гарсан нэг мөр тоолохгүй — гэхдээ нөгөө 2 нь үлдэнэ, 4 дэх нь хэвээр хаалттай
  assert.equal(MAX_ATTEMPTS, 3);
  assert.equal(VERIFICATION_VALID_MINUTES, 60);
});

test("түлхүүргүй, mock-гүй үед session үүсэхгүй", async () => {
  delete process.env.VERIFY_MN_API_KEY;
  delete process.env.VERIFY_MN_MOCK;
  delete process.env.VERCEL_ENV;
  const db = memoryDb();
  const r = await startVerification(db, "99110022", "signup", { role: "customer", ip: "203.0.113.20" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "unavailable");
  assert.equal(db.rows.length, 0);
});

test("хугацаа хэтэрсэн баталгаажуулалт зарцуулагдахгүй", async () => {
  mockEnv();
  const db = memoryDb();
  const started = await startVerification(db, "99113344", "phone", { selfUserId: "cu-9", ip: "203.0.113.21" });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  db.rows[0].createdAt = new Date(Date.now() - 5000);
  assert.equal(await refreshVerification(db, started.id), "VERIFIED");
  db.rows[0].verifiedAt = new Date(Date.now() - (VERIFICATION_VALID_MINUTES + 1) * 60_000);
  assert.equal(await consumeVerification(db, started.id, "99113344", "phone"), false);
});
