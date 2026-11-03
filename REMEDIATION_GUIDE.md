# Panduan Remediasi Lengkap — RS Yasmin (P0 → P2)

> Menindaklanjuti [AUDIT_REPORT.md](AUDIT_REPORT.md). Setiap langkah mencantumkan **Tujuan**, **Perintah/Kode**, dan **Verifikasi**.
> **Aturan emas:** kerjakan P0 dulu sampai tuntas sebelum menyentuh P1/P2. Kerjakan di branch `hardening/p0-audit` (sudah ada), commit bertahap, dan **backup database + `.env` sebelum mengubah apa pun**.

---

## 0. Persiapan (5 menit)

```bash
# 1. Pastikan di branch yang benar
git checkout hardening/p0-audit
git status

# 2. Backup DB (sesuaikan nama container)
docker compose exec postgres pg_dump -U yasmin -d yasmin > backup_pre_remediation_$(date +%F).sql

# 3. Backup secret lama (untuk rollback, simpan di luar repo!)
cp .env ../.env.backup.pre-remediation

# 4. Catat daftar secret yang akan dirotasi
#    JWT_SECRET, DEVICE_BOOTSTRAP_SECRET, DB_ROOT_PASSWORD, DB_PASSWORD,
#    SETTINGS_ENCRYPTION_KEY, GOOGLE_MAPS_API_KEY (2 buah)
```

---

# FASE P0 — Sebelum go-live (0–3 hari)

## P0-1. Hapus kredensial backdoor & rotasi seluruh secret

### Tujuan
Menghapus akun Master `root@dinamixx.id`/`[REDACTED]` dari kode & riwayat git, dan mengganti semua secret yang sudah pernah tertulis di file.

### Langkah 1a — Hapus `backend/setMaster.js` dari HEAD & riwayat git

Karena repository hanya punya 3 commit dan remote publik, riwayat harus ditulis ulang:

```bash
# Opsi A: git-filter-repo (direkomendasikan, butuh Python)
pip install git-filter-repo
git filter-repo --invert-paths --path backend/setMaster.js --force

# Opsi B: BFG (butuh Java)
# java -jar bfg.jar --delete-files setMaster.js
# git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Setelah filter-repo: remote ikut terputus, sambungkan ulang & force-push
git remote add origin https://github.com/taufiqrrahmanidid/rsyasmin.git
git push origin --force --all
git push origin --force --tags
```

> ⚠️ **Penting:** file ini SUDAH terlanjur ada di GitHub publik. Setelah force-push, tetap **anggap kredensialnya bocor**. Langkah 1c (rotasi + nonaktifkan akun) WAJIB dilakukan — purging riwayat saja tidak cukup karena pihak lain bisa sudah meng-clone.

```bash
# Opsi C (pragmatis, hanya jika riwayat tidak penting):
# Hapus file, buat repo baru dengan 1 commit bersih, lalu paksa push.
rm backend/setMaster.js
git rm --cached backend/setMaster.js   # jika sudah ter-track
```

### Langkah 1b — Ganti seeder Master dengan versi aman

Buat file baru `backend/scripts/seedMaster.js` (bukan hardcode password):

```js
// backend/scripts/seedMaster.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_MASTER_EMAIL;
  const password = process.env.SEED_MASTER_PASSWORD;
  if (!email || !password) {
    console.error('SEED_MASTER_EMAIL & SEED_MASTER_PASSWORD wajib di-set.');
    process.exit(1);
  }
  if (password.length < 16) {
    console.error('Password master minimal 16 karakter.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { email, name: 'Master', passwordHash: hash, role: 'Master', permissions: ['ALL_ACCESS'] },
  });
  console.log('✅ Akun Master di-seed.');
}
main().finally(() => prisma.$disconnect());
```

Jalankan sekali dengan password kuat dari terminal (jangan tulis ke file):

```bash
docker compose exec -e SEED_MASTER_EMAIL=master@rsyasmin.id \
  -e SEED_MASTER_PASSWORD="$(openssl rand -base64 24)" backend node scripts/seedMaster.js
```

### Langkah 1c — Nonaktifkan akun backdoor jika sudah pernah dibuat

```sql
-- Jalankan di DB: hapus/ubah akun backdoor
DELETE FROM "AdminUser" WHERE email = 'root@dinamixx.id';
-- dan periksa tidak ada akun lain ber-role Master yang tak dikenal
SELECT id, email, role FROM "AdminUser" ORDER BY role;
```

### Langkah 1d — Rotasi secret & generate ulang

```bash
# Generate semua secret baru (simpan HANYA ke .env, jangan ke file lain)
node -e "console.log('JWT_SECRET='+require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('DEVICE_BOOTSTRAP_SECRET='+require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SETTINGS_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('DB_ROOT_PASSWORD='+require('crypto').randomBytes(24).toString('base64url'))"
node -e "console.log('DB_PASSWORD='+require('crypto').randomBytes(24).toString('base64url'))"
```

Perbarui `.env` (root) dengan nilai baru. **Khusus `SETTINGS_ENCRYPTION_KEY`:** jangan diganti jika sudah ada `SystemSetting` terenkripsi — jika diganti, semua key lama tidak bisa dibaca. (Jika masih development dan belum ada data penting, aman untuk diganti.)

### Langkah 1e — Rotasi Google API key

1. Buka Google Cloud Console → APIs & Services → Credentials.
2. Temukan key `AIzaSyBJyzlxhYugf-wW4rlhxu_6qgHTx0N7fDM` dan `AIzaSyDDpxQXLbqot0nEHGcEtiLv0j_OMFpg-Ys`.
3. **Regenerate** keduanya (atau hapus & buat baru).
4. Set **application restriction → HTTP referrers** dan **API restriction** hanya ke Places API + Maps JS API.
5. Simpan key baru di `.env` (`GOOGLE_MAPS_API_KEY`) dan hapus dari `backend/.env`.

### Verifikasi P0-1
```bash
git log --all --oneline -- backend/setMaster.js   # → kosong
git ls-files | grep setMaster              # → kosong
grep -R "setMaster" backend/   # → kosong
```

---

## P0-2. Amankan endpoint data pasien (IDOR)

### Tujuan
`GET /api/patient/bookings/:nik` dan `GET /api/patient/ticket/:id` tidak boleh lagi terbuka tanpa verifikasi kepemilikan.

### Langkah 2a — Buat middleware auth pasien

Buat `backend/middlewares/patientAuth.js`:

```js
// backend/middlewares/patientAuth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function requirePatientAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentikasi diperlukan.' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.kind !== 'patient') throw new Error('bukan token pasien');
    req.patient = payload; // { kind, nik, phone }
    next();
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa.' });
  }
}

module.exports = { requirePatientAuth };
```

### Langkah 2b — Login pasien mengeluarkan JWT pasien

Edit `backend/server.js` di handler `POST /api/patient/login` (sekitar baris 694–698):

```js
// ganti blok res.json lama dengan:
const token = jwt.sign(
  { kind: 'patient', nik: cleanNik, phone: latestRecord.phone },
  JWT_SECRET,
  { expiresIn: '12h' }
);
res.json({
  success: true,
  token,
  patient: { name: latestRecord.patientName, phone: latestRecord.phone, nik: cleanNik },
  bookings,
});
```

### Langkah 2c — Ganti endpoint publik menjadi terlindungi + redaksi data

Hapus/ganti endpoint lama (baris 705–735) dengan:

```js
const { requirePatientAuth } = require('./middlewares/patientAuth');

// Helper: buang field sensitif dari record pendaftaran
function redactPendaftaran(r) {
  const { buktiTransferImage, adminNotes, noIdentitas, phone, ...safe } = r;
  return safe;
}

app.get('/api/patient/bookings', requirePatientAuth, async (req, res) => {
  try {
    const bookings = await prisma.pendaftaran.findMany({
      where: { noIdentitas: req.patient.nik },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings.map(redactPendaftaran));
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan internal server.' });
  }
});

app.get('/api/patient/ticket/:id', requirePatientAuth, async (req, res) => {
  try {
    const record = await prisma.pendaftaran.findUnique({ where: { id: req.params.id } });
    if (!record) return res.status(404).json({ error: 'Tiket tidak ditemukan.' });
    if (record.noIdentitas !== req.patient.nik) {
      return res.status(403).json({ error: 'Anda tidak berhak mengakses tiket ini.' });
    }
    res.json(redactPendaftaran(record));
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan internal server.' });
  }
});
```

> Catatan: `patient/ticket/:id` dipakai juga oleh halaman publik wizard (mengecek status tiket). Jika memang perlu publik, hanya kembalikan **status/antrean/nomor tiket** (tanpa nama/NIK/HP), dan jangan pernah `buktiTransferImage`/`adminNotes`.

### Langkah 2d — Update frontend pemanggil

- `PatientPortalDashboard.tsx`: simpan `token` dari login dan kirim `Authorization: Bearer <token>` pada fetch booking, lalu jangan simpan NIK/HP lengkap di `localStorage` (simpan token di `sessionStorage`, bukan `localStorage`).

### Verifikasi P0-2
```bash
# Tanpa token → harus 401
curl -i http://localhost/api/patient/bookings/1234567890123456
# Dengan token pasien A mengakses NIK pasien B → harus 403/401
```

---

## P0-3. Amankan route antrean

### Tujuan
Endpoint tulis antrean (`call/complete/skip`) tidak boleh dipanggil anonim; data publik antrean tidak boleh memuat PHI.

### Langkah 3a — Tambahkan auth di `backend/routes/queue.js`

Di awal file tambahkan import dan pasang middleware:

```js
const { requireAuth, requireRole } = require('../middlewares/rbac');

// Tulis (staff/admin saja)
router.post('/call', requireAuth, requireRole('Master', 'SuperUser', 'User'), async (req, res) => { ... });
router.post('/complete/:id', requireAuth, requireRole('Master', 'SuperUser', 'User'), async (req, res) => { ... });
router.post('/skip/:id', requireAuth, requireRole('Master', 'SuperUser', 'User'), async (req, res) => { ... });
router.get('/logs', requireAuth, requireRole('Master', 'SuperUser', 'User'), async (req, res) => { ... });
```

### Langkah 3b — Redaksi data publik (`/active` & `/display`)

Jangan me-*join* `Pendaftaran` penuh. Kembalikan hanya:

```js
// helper redaksi untuk layar antrean publik
function publicQueue(q) {
  return {
    queueNumber: q.queueNumber,
    polyclinic: q.polyclinic,
    status: q.status,
    loketNumber: q.loketNumber,
  };
}
// panggil publicQueue(q) di /active dan di payload SSE /display
```

- `GET /api/queue/active`: hapus `Promise.all` yang me-*fetch* `Pendaftaran`, ganti dengan `queues.map(publicQueue)`.
- `GET /api/queue/display`: tulis `queues.map(publicQueue)` sebelum `res.write`.

### Verifikasi P0-3
```bash
curl -i -X POST http://localhost/api/queue/call -H 'Content-Type: application/json' -d '{"queueId":"x"}'
# → 401 Unauthorized
curl http://localhost/api/queue/active   # → hanya nomor antrean & poli, tanpa nama/NIK/HP
```

---

## P0-4. Bersihkan PHI & secret dari disk + perkuat .gitignore

### Tujuan
Dump SQL pasien, `server_routes.txt`, dan `backend/.env` tidak boleh berada di direktori proyek / rawan ter-commit.

### Langkah 4a — Pindahkan/hapus file sensitif

```bash
# Pindahkan dump ke lokasi di LUAR repo (mis. drive backup terenkripsi)
mv backup_yasmin.sql ../backups/
mv data_mysql84.sql ../backups/

# Hapus file berisi secret
rm server_routes.txt
rm backend/.env          # config MySQL usang yang menyesatkan

# Hapus build artifact stale & arsip zip (opsional, agar repo bersih)
rm -rf frontend/dist
rm backend.zip frontend.zip
```

### Langkah 4b — Perkuat `.gitignore`

Tambahkan ke `.gitignore`:

```gitignore
# Database dumps (PHI) — JANGAN pernah commit
*.sql
*.dump
*.sql.gz

# Arsip
*.zip
*.tar
*.tar.gz

# Secret helper output
server_routes.txt
```

### Langkah 4c — Pastikan tidak ada yang ter-commit

```bash
git status --ignored | grep -E '\.sql|server_routes|\.env$'
git ls-files | grep -E '\.sql|server_routes|\.env$'   # → harus kosong
```

### Verifikasi P0-4
```bash
ls -la | grep -E '\.sql|server_routes'   # → kosong
```

---

## P0-5. Aktifkan HTTPS + cookie secure

### Tujuan
Semua lalu lintas terenkripsi; cookie JWT aman; HSTS berfungsi.

### Langkah 5a — `nginx.conf`: tambahkan blok TLS 443

```nginx
server {
    listen 443 ssl http2;
    server_name yasmin.example.id;   # ganti domain resmi

    ssl_certificate     /etc/letsencrypt/live/yasmin.example.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yasmin.example.id/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    # ... (pertahankan lokasi /api, /socket.io, / seperti sebelumnya) ...
}

server {
    listen 80;
    server_name yasmin.example.id;
    return 301 https://$host$request_uri;   # redirect HTTP→HTTPS
}
```

### Langkah 5b — Cookie `secure: true` otomatis di produksi

Edit `backend/server.js` baris 138–143:

```js
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ← ganti hardcode `false`
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
});
```

### Langkah 5c — Update docker-compose untuk TLS

```yaml
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/letsencrypt:ro   # mount sertifikat
```

> Untuk sertifikat: gunakan Certbot (standalone/cloudflare) di host atau layanan LB. Dalam tahap dev lokal, HTTPS bisa memakai `mkcert` untuk testing.

### Verifikasi P0-5
```bash
curl -sI https://yasmin.example.id | grep -i 'strict-transport-security\|x-frame-options'
# Set-Cookie harus ada atribut: HttpOnly; Secure; SameSite=Strict
```

---

# FASE P1 — Minggu 1–2

## P1-1. Satukan mekanisme auth (hapus `admin_token` localStorage)

### Tujuan
Satu mekanisme: **httpOnly cookie + `credentials:'include'`**. Tidak ada token di `localStorage`.

### Langkah 1a — Login kembalikan hanya user (cookie otomatis)

`POST /api/auth/login` sudah benar (men-set cookie). Pastikan **tidak** menambahkan `token` ke response body.

### Langkah 1b — `AdminPendaftaranLogin.tsx`

```tsx
// hapus baris: localStorage.setItem('admin_token', data.token);
localStorage.setItem('admin_user', JSON.stringify(data.user));
onLoginSuccess(data.user);
```

### Langkah 1c — `adminApi.ts`

Ganti `getAuthHeader` dengan `credentials: 'include'`:

```ts
function getAuthOptions(): RequestInit {
  return { credentials: 'include' };
}
// contoh pemakaian:
const res = await fetch(`${API_BASE}/pendaftaran`, { ...getAuthOptions() });
```

### Langkah 1d — `AdminPendaftaran/index.tsx` & `AdminDashboard.tsx`

- Hapus semua `localStorage.getItem('admin_token')` dan kiriman `Authorization: Bearer`.
- Semua fetch ke backend pakai `credentials: 'include'`.
- Pastikan CORS backend sudah `credentials: true` + origin whitelist (sudah ada di `middlewares/cors.js`).

### Langkah 1e — Logout

`POST /api/auth/logout` sudah `clearCookie`. Cukup hapus `admin_user`/`master_admin_session` dari localStorage.

### Verifikasi P1-1
```bash
# Login via browser → network tab: response tidak berisi token, cookie httpOnly ter-set.
# Refresh /admin/pendaftaran → data termuat (tidak 401).
```

---

## P1-2. Ganti `Math.random()` dengan `crypto`

### Tujuan
Token & ID tidak dapat ditebak / tidak tabrakan.

### Langkah 2a — Token invite (`server.js` baris 582–583)

```js
const { randomUUID, randomBytes, randomInt } = require('crypto');

// ganti:
const randomSalt = Math.random().toString(36).substring(2, 6);
const uniqueToken = `ysm-reg-${timestamp}-${randomSalt}`;
// menjadi:
const uniqueToken = `ysm-reg-${randomUUID()}`;
```

### Langkah 2b — ID pendaftaran (baris 802)

```js
// ganti: 'YSM-' + Math.floor(100000 + Math.random() * 900000)
const uniqueId = 'YSM-' + randomInt(100000, 1000000);
```

### Langkah 2c — Kode booking (baris 925–927)

```js
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len) {
  const bytes = randomBytes(len);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}
// const bCode = randomCode(6);
```

### Langkah 2d — Bersihkan `Math.random` lain

```bash
grep -R "Math.random" backend/ frontend/src/
# Ganti semua yang menghasilkan ID/token dengan crypto; yang sekadar UI boleh dibiarkan.
```

### Verifikasi P1-2
```bash
grep -R "Math.random" backend/   # → hanya tersisa yang non-kritis (jika ada)
```

---

## P1-3. Validasi input & tutup mass-assignment

### Tujuan
Tidak ada `req.body` yang langsung di-`create`/`update`; semua field divalidasi tipe & whitelist.

### Langkah 3a — Artikel (`PATCH /api/articles/:id`, baris 527–539)

```js
const articleUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  coverImage: z.string().max(5_000_000).optional().nullable(),
  author: z.string().max(100).optional(),
}).strict();

app.patch('/api/articles/:id', requireAuth, requirePermission('ACTION_WRITE_ARTICLE'), adminWriteLimiter,
  validateBody(articleUpdateSchema), async (req, res) => {
    // req.body sudah bersih (hanya field whitelist)
    const updated = await prisma.article.update({ where: { id: req.params.id }, data: req.body });
    ...
  });
```

> `validateBody` (`middlewares/validate.js`) sudah menimpa `req.body` dengan data terparse; `.strict()` menolak field tak dikenal.

### Langkah 3b — Master data (ganti `z.any()`)

Di `MASTER_DATA_CONFIG` (baris 1956+), definisikan skema eksplisit, contoh untuk `doctors`:

```js
const doctorsSchema = z.object({
  name: z.string().max(200),
  specialty: z.string().max(200),
  subSpecialty: z.string().max(200).nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  speciali: z.string().max(200).nullable().optional(),
  experience: z.number().int().min(0).max(80),
  rating: z.number().min(0).max(5),
  bpjs: z.boolean(),
  education: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  status: z.string().max(50),
  gradGradDate: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  specGradDate: z.string().nullable().optional(),
  specLicenseNumber: z.string().nullable().optional(),
  joinDate: z.string().nullable().optional(),
  leaveFromDate: z.string().nullable().optional(),
  leaveToDate: z.string().nullable().optional(),
  schedule: z.record(z.any()).nullable().optional(), // validasi Json terstruktur
}).strict();
```

Simpan skema per koleksi dalam `MASTER_DATA_CONFIG` dan pakai `validateBody(config.schema)` di route `save`/`sync`.

### Langkah 3c — Feedback pasien (`POST /api/feedback`)

Validasi `messages` sebagai array string, `attachments` sebagai array terbatas (jumlah & ukuran), `kesan` max length.

### Verifikasi P1-3
```bash
curl -X PATCH http://localhost/api/articles/<id> -H 'Authorization: Bearer <admin>' \
  -H 'Content-Type: application/json' -d '{"id":"hack","isPublished":false}'
# → 400 (field id ditolak oleh .strict())
```

---

## P1-4. Upgrade dependensi (atasi `npm audit` HIGH)

### Tujuan
Menghilangkan 3 HIGH backend + 2 HIGH frontend.

### Langkah 4a — Backend

```bash
cd backend
npm install prisma@latest @prisma/client@latest
npm audit                          # verifikasi
npm audit --audit-level=high       # untuk CI
```

Jika upgrade Prisma major membutuhkan perubahan skema, ikuti panduan migrasi Prisma. Minimal, jalankan `npx prisma migrate dev` untuk memvalidasi.

### Langkah 4b — Frontend

```bash
cd frontend
npm install vite@latest @vitejs/plugin-react@latest
npm install -D vitest@latest
npm audit
```

> `vite <=6.4.3` rentan pada `launch-editor` (CWE-77/78/88). Naikkan ke Vite 7 (atau minimal 6.4.4+).

### Langkah 4c — Jadikan CI

```yaml
# .github/workflows/audit.yml (contoh)
- run: npm audit --audit-level=high   # backend
- run: npm audit --audit-level=high   # frontend
```

### Verifikasi P1-4
```bash
npm audit --omit=dev | tail -n 3   # → 0 high/critical di deps produksi
```

---

## P1-5. Batasi Google API key

### Tujuan
Key yang bocor/teregenerasi tidak bisa disalahgunakan pihak lain.

### Langkah
1. Google Cloud Console → Credentials → pilih key aktif.
2. **Application restrictions** → *HTTP referrers* → isi domain produksi (`https://yasmin.example.id/*`) dan localhost untuk dev.
3. **API restrictions** → hanya *Places API*, *Maps JavaScript API*.
4. **Key rotation** (sudah di P0-1e).
5. Untuk `GOOGLE_CLIENT_SECRET` / refresh token (GBP): simpan via menu Pengaturan (terenkripsi di `SystemSetting`), bukan di `.env`/kode.

### Verifikasi P1-5
Cek di Google Cloud: key tidak berstatus "unrestricted".

---

# FASE P2 — Bulan 1–2

## P2-1. Refactor monolith `server.js` (2.213 baris)

### Tujuan
Modular, mudah diuji, mudah dipelihara.

### Struktur target

```
backend/
  src/
    app.js                 # express app + middleware global
    server.js              # bootstrap (listen, cron, socket)
    routes/
      auth.js patients.js admin.js articles.js reviews.js
      masterData.js kpi.js queue.js social.js
    middlewares/
      rbac.js patientAuth.js cors.js security.js rateLimiters.js validate.js
    services/
      prisma.js simrs.js googleSync.js settings.js
    jobs/
      cron.js
    utils/
      encryption.js
  prisma/schema.prisma
```

### Langkah
1. Buat `services/prisma.js` → ekspor **satu** `PrismaClient` (hapus 4 instance duplikat di `server.js`, `utils/settings.js`, `services/simrsBridge.js`, `routes/queue.js`).
2. Pindahkan tiap grup route ke file `routes/*.js`.
3. Pindahkan cron ke `jobs/cron.js`.
4. Hapus kode mati: `backend/index.js`, `middlewares/rateLimiter.js`, duplikat `simrsBridge.js` vs `services/simrsBridge.js`, dan `frontend/src/lib/api.ts` (`submitPendaftaran` → endpoint yang tak ada).
5. Uji ulang endpoint satu per satu (smoke test).

### Verifikasi P2-1
```bash
wc -l backend/server.js      # turun drastis
node backend/src/server.js   # boot tanpa error
```

---

## P2-2. Sinkronisasi dokumentasi & env

### Tujuan
Tidak ada lagi drift MySQL/Postgres dan env yang menyesatkan.

### Langkah
1. Perbarui `README.md`: ganti MySQL → **PostgreSQL 16**; sesuaikan langkah setup (migrate Prisma, bukan `docker-compose exec mysql`).
2. Perbarui `backend/.env.example`: `DATABASE_URL=postgresql://...` sesuai `schema.prisma`.
3. Lengkapi `.env.example` root dengan **semua** key yang diwajibkan compose:
   ```
   SETTINGS_ENCRYPTION_KEY=generate-dengan-node-crypto
   DEVICE_BOOTSTRAP_SECRET=generate-dengan-node-crypto
   DB_ROOT_PASSWORD=generate-dengan-node-crypto
   ```
4. Hapus `backend/.env` (sudah di P0-4); jadikan root `.env` satu-satunya sumber.
5. Perbaiki `docker-compose.yml`: tambahkan healthcheck frontend/nginx, `read_only`/`cap_drop` untuk backend & nginx, dan step migrasi (`prisma migrate deploy`) sebagai init.

### Verifikasi P2-2
```bash
cp .env.example .env.test && docker compose config   # tidak ada error `?`/missing
```

---

## P2-3. Enkripsi PHI at-rest & retensi log

### Tujuan
Data medis tidak tersimpan plaintext; ada kebijakan retensi.

### Langkah
1. **Enkripsi kolom PHI** — gunakan helper yang sudah ada (`utils/encryption.js`) atau library `pgcrypto`. Minimal enkripsi `noIdentitas`, `phone` (simpan hash/encrypted), dan jangan simpan `buktiTransferImage` base64 di DB.
2. **Pindahkan bukti transfer** ke object storage (S3/MinIO) → simpan URL + metadata, bukan base64.
3. **Retensi AuditLog** — tambahkan cron yang mengarsip/menghapus `AuditLog` > N bulan dan `SystemSettingLog` sesuai kebijakan.
4. **Log akses PHI** — catat `GET` terhadap data pasien (who viewed what) untuk audit kepatuhan.
5. **Data minimization** — hapus `attachments` base64 di `PatientFeedback`, batasi lama penyimpanan.

### Verifikasi P2-3
```sql
SELECT id, phone, "noIdentitas" FROM "Pendaftaran" LIMIT 1;
-- nilai harus terenkripsi/tidak terbaca plaintext
```

---

## P2-4. Tambah test keamanan & CI

### Tujuan
Mencegah regresi pada auth/RBAC/IDOR/rate-limit.

### Langkah — contoh test (Jest + Supertest)

```js
// backend/src/__tests__/auth.test.js
const request = require('supertest');
const app = require('../app');

test('GET /api/patient/bookings tanpa token → 401', async () => {
  await request(app).get('/api/patient/bookings').expect(401);
});

test('queue call tanpa auth → 401', async () => {
  await request(app).post('/api/queue/call').send({ queueId: 'x' }).expect(401);
});

test('login dengan password salah → 401 + rate limit aktif', async () => {
  for (let i = 0; i < 25; i++) {
    await request(app).post('/api/auth/login').send({ email: 'x@y.z', password: 'salah' });
  }
  const res = await request(app).post('/api/auth/login').send({ email: 'x@y.z', password: 'salah' });
  expect(res.status).toBe(429);
});
```

Tambahkan ke `.github/workflows/ci.yml`:
```yaml
- run: npm test --prefix backend
- run: npm run test --prefix frontend
- run: npm run lint --prefix frontend
```

### Verifikasi P2-4
```bash
npm test --prefix backend   # hijau
```

---

## Checklist Final (Definition of Done)

- [ ] `git log --all --oneline -- backend/setMaster.js` kosong; `setMaster.js` hilang dari riwayat & remote.
- [ ] Semua secret dirotasi; Google key terbatasi referrer; akun `root@dinamixx.id` hilang dari DB.
- [ ] `curl` endpoint pasien tanpa token → 401; akses silang → 403.
- [ ] `curl` antrean (call/complete/skip) tanpa token → 401; data publik antrean tanpa NIK/HP/nama.
- [ ] Tidak ada `*.sql`, `server_routes.txt`, `backend/.env`, `frontend/dist` di working directory; `.gitignore` mencakup `*.sql`.
- [ ] HTTPS aktif; header HSTS + cookie `Secure` ada.
- [ ] `npm audit --omit=dev` = 0 high/critical (backend & frontend).
- [ ] Tidak ada token di `localStorage`; semua fetch pakai `credentials:'include'`.
- [ ] `grep -R "Math.random" backend/` hanya menyisakan penggunaan non-kritis.
- [ ] `PATCH /api/articles/:id` menolak field tak dikenal (`.strict()`).
- [ ] Test keamanan berjalan di CI dan hijau.

---

### Urutan pengerjaan yang disarankan (ringkas)

```
P0-1 (rotasi secret + purge git)  →  P0-2 (IDOR)  →  P0-3 (queue auth)
     →  P0-4 (bersihkan PHI)  →  P0-5 (HTTPS)
P1-1 (auth unify) → P1-2 (crypto) → P1-3 (validasi) → P1-4 (deps) → P1-5 (Google key)
P2-1 (refactor) → P2-2 (docs/env) → P2-3 (enkripsi PHI) → P2-4 (tests/CI)
```

> **Catatan penting:** karena kredensial backdoor & secret pernah berada di mesin/disk proyek ini, perlakukan seluruhnya sebagai **terkompromi**. Rotasi adalah satu-satunya mitigasi yang benar — membersihkan riwayat git tidak menghapus salinan yang mungkin sudah di-clone pihak lain.
