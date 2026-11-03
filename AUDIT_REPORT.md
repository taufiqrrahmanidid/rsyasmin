# Laporan Audit Menyeluruh — RS Yasmin (SIMRS Web)

**Peran audit:** Manajer IT / Manajer Fullstack Developer
**Tanggal audit:** 3 November 2026
**Cakupan:** `backend/` (Node.js + Express + Prisma), `frontend/` (React 19 + Vite), konfigurasi deployment (Docker, nginx, PM2), data/privasi, dependensi, dan riwayat git.
**Branch aktif:** `hardening/p0-audit` (belum di-commit/di-push ke `main`).
**Remote:** `https://github.com/taufiqrrahmanidid/rsyasmin.git`

> **Verdict keseluruhan: RISIKO TINGGI (HIGH).** Sistem ini sedang dalam proses "hardening", tetapi masih mengandung sejumlah celah kritis (kredensial backdoor ter-push ke GitHub publik, endpoint data pasien tanpa autentikasi, dan data medis sensitif tercecer di disk). **Jangan go-live sebelum temuan P0 ditangani.**

---

## 1. Ringkasan Eksekutif

| Kategori | Jumlah Temuan | Severitas Terberat |
|---|---|---|
| Keamanan & Auth | 14 | **CRITICAL** |
| Privasi Data (PHI) | 5 | **CRITICAL** |
| Arsitektur & Kualitas Kode | 9 | HIGH |
| Konfigurasi & Deployment | 7 | HIGH |
| Dependensi & Vulnerabilitas | 2 (report) | HIGH |

**3 hal yang harus dibereskan hari ini (P0):**
1. Akun **Master backdoor** (`root@dinamixx.id` / `[REDACTED]`) ter-commit dan **ter-push ke GitHub publik**.
2. Endpoint **data pasien tanpa autentikasi** (`/api/patient/*` dan `/api/queue/*`) membocorkan NIK, nomor HP, nama, dan foto bukti transfer.
3. **Secret & dump database pasien** (`backup_yasmin.sql`, `data_mysql84.sql`, `.env`, `server_routes.txt`) tersimpan di direktori proyek — dan `*.sql` **tidak** di-`.gitignore`.

---

## 2. Temuan Kritis (P0 — Harus Segera)

### 2.1 [CRITICAL] Kredensial Master hardcoded & ter-push ke GitHub publik
- **Lokasi:** `backend/setMaster.js` (baris 6, 9–11) — *ter-tracking di git dan ada di HEAD/remote*.
- **Isi:** `email: 'root@dinamixx.id'`, `password: '[REDACTED]'`, `role: 'Master'`.
- **Dampak:** Siapa pun yang membaca repository (publik) bisa login sebagai **Master** (bypass seluruh RBAC) dan/atau membuat akun Master sendiri. Ini *backdoor* permanen.
- **Bukti:** `git show HEAD:backend/setMaster.js` menampilkan `bcrypt.hash('[REDACTED]', 10)`; `git log --all -S '[REDACTED]'` → commit `85d1801`.

**Rekomendasi:**
- Segera **rotasi** seluruh kredensial dan hapus file ini dari riwayat git (gunakan `git filter-repo`/`BFG`, bukan sekadar hapus di working tree), lalu **force-push** dan **rotate ulang** secret karena yang lama dianggap bocor.
- Seed akun Master harus dilakukan **satu kali secara manual** dengan password kuat yang di-generate via `crypto.randomBytes`, atau via env var `SEED_MASTER_PASSWORD`, bukan hardcode di kode.
- Cabut password `[REDACTED]` dari mana pun (jika sudah pernah dijalankan di DB).

### 2.2 [CRITICAL] Endpoint data pasien tanpa autentikasi (IDOR / PHI disclosure)
Di `backend/server.js`, endpoint berikut **publik** (tanpa `requireAuth`) dan mengembalikan data pasien lengkap:

| Endpoint | Baris | Data yang bocor |
|---|---|---|
| `GET /api/patient/bookings/:nik` | 706–718 | Semua riwayat pendaftaran berdasarkan **NIK** (nama, HP, NIK, poli, dokter, `buktiTransferImage`, `adminNotes`) |
| `GET /api/patient/ticket/:id` | 721–735 | 1 record penuh berdasarkan **ID tiket** (termasuk foto bukti transfer base64 & catatan admin) |

- **Dampak:** IDOR murni — penyerang cukup menebak/mengiterasi NIK (16 digit) atau ID tiket (`YSM-xxxxxx`, 6 digit acak) untuk menarik PHI pasien lain. Ini melanggar kewajiban kerahasiaan data medis (UU PDP No. 27/2022, Permenkes, standar SatuSehat).
- **Perbaikan:** (a) ganti identitas login pasien dari NIK ke *token passcode yang diverifikasi*; (b) `ticket/:id` wajib memverifikasi kepemilikan (passcode/otp) sebelum mengembalikan record; (c) jangan pernah mengembalikan `buktiTransferImage`/`adminNotes` ke sisi publik; (d) beri rate-limit ketat.

### 2.3 [CRITICAL] Seluruh route antrean tidak berautentikasi
- **Lokasi:** `backend/routes/queue.js` (di-mount di `server.js` baris 2126–2127 tanpa middleware auth).
- Endpoint publik: `POST /api/queue/call`, `POST /api/queue/complete/:id`, `POST /api/queue/skip/:id`, `GET /api/queue/active`, `GET /api/queue/logs`, `GET /api/queue/display`.
- **Dampak:** Siapa pun dapat **memanggil/menyelesaikan/menskip antrean pasien** (gangguan operasional nyata di rumah sakit), dan membaca data pasien yang di-*join* (`/active` & `/logs` mengembalikan objek `Pendaftaran` penuh — termasuk NIK & HP).
- **Perbaikan:** Tambahkan `requireAuth` + `requireRole('Master','SuperUser','User')` pada endpoint tulis; batasi `/active` & `/display` hanya mengembalikan kolom yang aman untuk layar publik (nomor antrean & poli, **tanpa** nama/NIK/HP penuh). Terapkan auth juga pada koneksi SSE.

### 2.4 [CRITICAL] Secret & dump PHI tersimpan di disk proyek
- **File sensitif di working directory (untracked, belum ke git — tapi rawan):**
  - `.env` (root) — `JWT_SECRET`, `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `SETTINGS_ENCRYPTION_KEY`, **Google Maps API key** (`AIzaSyBJy...`).
  - `backend/.env` — `JWT_SECRET` **berbeda**, `GOOGLE_MAPS_API_KEY` **berbeda** (`AIzaSyDDp...`).
  - `server_routes.txt` — salinan output terminal berisi `JWT_SECRET`, `DEVICE_BOOTSTRAP_SECRET`, `DB_ROOT_PASSWORD`, `DB_PASSWORD` **plaintext**.
  - `backup_yasmin.sql` (3.9 MB) & `data_mysql84.sql` (1.95 MB) — **dump MySQL berisi data pasien nyata**: nama, HP, **NIK 16 digit**, **foto bukti transfer (base64 JPEG)**, hash bcrypt `AdminUser`, hash passcode `RegistrationInvite`.
- **Perbaikan:**
  - Pindahkan `*.sql` keluar repo, dan **tambahkan `*.sql` ke `.gitignore`** (saat ini hanya `.db`/`.sqlite`).
  - Hapus `server_routes.txt` dan rotasi seluruh secret yang tercantum di dalamnya.
  - Satu sumber `.env` saja (root), hapus `backend/.env` yang sudah usang; rotasi kedua Google API key (dianggap bocor karena pernah ditulis di file).

### 2.5 [HIGH] Pembuatan token/ID memakai `Math.random()` (predictable)
- **Lokasi:** `server.js` baris 582–583 (token invite `ysm-reg-${timestamp}-${Math.random()}`), baris 802 (ID pendaftaran `YSM-${Math.random()*900000}`), baris 925–927 (kode booking), `backend/index.js` (ID tiket WA).
- **Dampak:** Token invite hanya punya entropi ~36⁴ (≈1.6M) dan timestamp bisa ditebak → **brute-force tautan pendaftaran** dan **tabrakan ID** (`Math.random` tidak aman untuk ID unik).
- **Perbaikan:** Gunakan `crypto.randomUUID()` / `crypto.randomBytes(16).toString('hex')` untuk token & ID; kode booking pakai `crypto.randomInt`.

---

## 3. Temuan Tinggi (P1 — Segera Setelah P0)

### 3.1 [HIGH] Tidak ada HTTPS/TLS; cookie `secure:false` & HSTS tidak efektif
- **Lokasi:** `nginx.conf` hanya `listen 80` (tanpa blok 443/ssl); `backend/server.js` baris 140 `secure: false` di-hardcode; `docker-compose.yml` hanya ekspose `80:80`.
- **Dampak:** Seluruh lalu lintas (kredensial admin, data pasien, token JWT di cookie) berjalan plaintext. HSTS `maxAge 1 tahun` di `backend/middlewares/security.js` tidak berguna karena tidak ada TLS.
- **Perbaikan:** Terminasi TLS di nginx (Let's Encrypt/domain resmi), `listen 443 ssl http2`, redirect 80→443, set `secure: true` + `sameSite: 'strict'` + `__Host-` prefix pada cookie saat `NODE_ENV=production`.

### 3.2 [HIGH] Inkonsistensi mekanisme auth (cookie vs token) — modul admin rusak
- Backend login (`server.js` 123–150) **men-set cookie httpOnly** dan **tidak mengembalikan `token`** di body.
- `AdminPendaftaranLogin.tsx` (baris 32) menyimpan `data.token` → **`undefined`** ke `localStorage`, lalu `adminApi.ts` mengirim `Authorization: Bearer undefined` **tanpa** `credentials: 'include'`.
- `AdminDashboard.tsx` mengandalkan cookie (same-origin), tapi `.env.example` mengarahkan `VITE_BACKEND_URL` ke domain **cross-origin** (`api.yasminhospital.dinamixnet.id`).
- **Dampak:** Auth pada modul Pendaftaran **tidak berfungsi** di deployment cross-origin (selalu 401); campuran dua mekanisme rawan bug keamanan.
- **Perbaikan:** Pilih **satu** mekanisme (rekomendasi: httpOnly cookie + `credentials:'include'` + CORS origin whitelist), konsisten di seluruh klien, dan hapus `admin_token` dari localStorage.

### 3.3 [HIGH] Validasi lemah / mass-assignment pada endpoint tulis
- `PATCH /api/articles/:id` (`server.js` 527–539): `data: req.body` langsung — klien bisa menimpa `id`, `slug`, `views`, `isPublished`, dll.
- `MASTER_DATA_CONFIG` + `z.any().optional()` (`server.js` 2012–2034) → **tanpa validasi tipe nyata** (semua field diterima apa adanya, termasuk `Json`/`schedule` arbitrer).
- **Perbaikan:** Definisikan skema Zod eksplisit per field (tipe, enum, max-length), whitelist field yang boleh di-update, dan validasi `schedule`/`messages`/`attachments` sebagai struktur Json yang sah.

### 3.4 [HIGH] Kunci Google Maps hardcoded & PHI di `localStorage`
- Google Maps API key ada di `.env`, `backend/.env`, dan `backend/index.js` (baris 221) hardcode `RS_YASMIN_PLACE_ID`. `frontend/dist` (build lama) juga menyimpan URL produksi hardcoded.
- `PatientPortalDashboard.tsx` menyimpan akun pasien (nama/HP/NIK) di `localStorage` (`yasmin_patient_account`); `PatientRegistrationWizard` & komponen lain menyimpan data master di `localStorage` sebagai *source of truth*.
- **Dampak:** XSS sekecil apa pun dapat mencuri PHI; API key yang bocor bisa disalahgunakan (biaya/kuota Google).
- **Perbaikan:** Batasi API key Google dengan HTTP referrer restriction; jangan simpan NIK/PHI di `localStorage`; pindahkan state master data ke server.

### 3.5 [HIGH] Passcode pasien dikirim plaintext & disimpan di WhatsApp template
- `POST /api/invite-link` (`server.js` 602) menyusun `waTemplate` yang **memuat `passcode` dalam plaintext** ke chat WhatsApp.
- **Perbaikan:** Kirim tautan + passcode lewat saluran terpisah, atau paksa reset saat pertama login; pertimbangkan OTP sekali pakai.

---

## 4. Temuan Menengah (P2)

| # | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|
| 4.1 | **Device licensing bisa dibypass** — `deviceHash` dibuat client-side (`Math.random`), device pertama auto-disetujui, dan token valid apa pun lolos. | `server.js` 393–438; `AdminPendaftaran/index.tsx` 34–55 | Jadikan kontrol ini *bukan* lapisan keamanan; tambahkan verifikasi perangkat sisi server (attestation) atau buang sama sekali. |
| 4.2 | **CSP masih report-only**, `style-src 'unsafe-inline'`, `frame-src` banyak origin, `connect-src ws://`. | `nginx.conf` 68–69 | Setelah stabil, aktifkan `Content-Security-Policy` (bukan `-Report-Only`), kurangi `frame-src`, pakai `wss://`. |
| 4.3 | **Rate limit tidak konsisten & soket tanpa limit** — `rateLimiter.js` (100/15m) tidak terpakai; `rateLimiters.js` global 2000/15m; koneksi `socket.io` tanpa rate limit/auth untuk anonymous. | `server.js` 57, 76–91; `middlewares/*` | Hapus `rateLimiter.js`; batasi koneksi soket; bedakan limit per IP via header proxy. |
| 4.4 | **Error message bocor detail internal** — `err.message` dikembalikan ke klien (mis. `server.js` 523, 2046). | berbagai | Log detail di server, kembalikan pesan generik ke klien. |
| 4.5 | **CSP `frameAncestors 'none'` di backend** bisa konflik dengan kebutuhan iframe embed sosial; koordinasikan dengan nginx. | `middlewares/security.js` | Samakan kebijakan header antara nginx dan backend. |
| 4.6 | **Feedback & lampiran pasien disimpan base64** di kolom `Json` (`PatientFeedback.attachments`, `Pendaftaran.buktiTransferImage`). | `schema.prisma` 206–214, 62 | Simpan file di object storage, simpan hanya URL/metadata di DB. |

---

## 5. Arsitektur & Kualitas Kode

1. **Dokumentasi tidak sinkron dengan implementasi** — README menyebut MySQL, `backend/.env.example` berisi `DATABASE_URL=mysql://...`, tetapi `schema.prisma` menggunakan `provider = "postgresql"` dan `docker-compose.yml` menjalankan Postgres 16. Tim baru akan tersesat.
2. **Konfigurasi ganda yang bertentangan** — `.env` root (Postgres + `SETTINGS_ENCRYPTION_KEY`) vs `backend/.env` (MySQL + JWT/API key berbeda). Server memuat `backend/.env`? Tidak — `dotenv` di `server.js` membaca `.env` dari CWD (root saat Docker), sehingga `backend/.env` adalah **config mati yang menyesatkan**.
3. **Kode legacy rusak (`backend/index.js`)** — WhatsApp bot + Firebase yang `require('./firebase-key.json')` (file **tidak ada**), dan dependensi `whatsapp-web.js`, `qrcode-terminal`, `firebase-admin` **tidak ada di `package.json`**. File ini akan crash jika dijalankan, dan berisi hardcode nomor rekening bank + Place ID.
4. **Monolith 2.213 baris** di `server.js` (semua route, helper, cron, soket dalam satu file) — sulit diuji dan dipelihara. Pisahkan per modul (auth, patients, master-data, reviews, kpi).
5. **Banyak instance `PrismaClient`** — dibuat ulang di `server.js`, `utils/settings.js`, `services/simrsBridge.js`, `routes/queue.js`. Buat satu instance shared untuk menghemat connection pool.
6. **Kode mati/duplikat** — `middlewares/rateLimiter.js` tidak dipakai; `simrsBridge.js` (root) vs `services/simrsBridge.js` (duplikat konsep, keduanya belum terhubung ke SIMRS nyata); `lib/api.ts` `submitPendaftaran` mengirim ke `POST /api/pendaftaran` yang **tidak ada** (wizard asli memakai `/submit-token`).
7. **Build artifact stale** — `frontend/dist` berisi bundle lama dengan URL produksi hardcoded `api.yasminhospital.dinamixnet.id`; pastikan `dist` tidak pernah ter-commit dan di-rebuild dari source terkini.
8. **State `localStorage` sebagai sumber kebenaran** — `App.tsx`/`AdminDashboard.tsx` menyimpan master data & RS info di `localStorage` dan melakukan sinkronisasi dua arah; rawan inkonsistensi & race condition. Server harus jadi satu-satunya *source of truth*.
9. **Tes sangat minim** — hanya 1 test frontend (`Footer.test.tsx`); backend punya `jest`/`supertest` di devDeps tapi tidak ada suite untuk auth/RBAC/IDOR. Tambahkan test keamanan (unit + integration) sebagai *regression guard*.

---

## 6. Konfigurasi & Deployment

1. **`SETTINGS_ENCRYPTION_KEY` wajib di docker-compose tapi tidak ada di `.env.example`** (root) → fresh clone gagal `docker compose up`. Lengkapi `.env.example` dengan `SETTINGS_ENCRYPTION_KEY`, `DEVICE_BOOTSTRAP_SECRET`, `DB_ROOT_PASSWORD` (placeholder).
2. **`NODE_ENV=development`** di `.env` root; nilai default deployment juga `development` di compose. Pastikan produksi memakai `production` dan sekaligus mengaktifkan `secure` cookie.
3. **Frontend container sudah di-hardening** (`read_only`, `tmpfs`, `cap_drop: ALL`, `no-new-privileges`) — bagus. **Backend & nginx container belum** mendapatkan treatment serupa (no `read_only`/`cap_drop`); tambahkan untuk mengurangi blast radius.
4. **Tanpa healthcheck di frontend/nginx**, dan backend hanya mengecek `/health`. Tambahkan healthcheck nginx & frontend.
5. **Dua model deployment bertentangan** — `ecosystem.config.js` (PM2 cluster, `NODE_ENV=production`) vs Docker Compose. Pilih satu untuk produksi agar tidak ada dua sumber kebenaran.
6. **`backend/Dockerfile` tidak menjalankan migrasi otomatis** (`prisma migrate deploy` hanya di README manual). Tambahkan langkah migrate yang terkontrol (job terpisah) agar deploy idempoten.
7. **`client_max_body_size 15M`** vs `express.json({ limit: '10mb' })` + base64 gambar — konsistenkan dan batasi ukuran upload bukti transfer (mis. kompres/resize di klien).

---

## 7. Privasi Data & Kepatuhan (PHI)

1. **Data pasien tersimpan & terkirim tanpa enkripsi lapangan** — NIK, HP, nama, foto bukti transfer plaintext di `Pendaftaran`. Hanya `SystemSetting` yang dienkripsi (AES-256-GCM). Pertimbangkan enkripsi kolom PHI + *at-rest encryption* untuk database.
2. **Dump SQL ber-PHI di repo kerja** (lihat 2.4) — risiko tertinggi untuk kepatuhan. Juga `*.sql` belum di-`.gitignore`.
3. **Akses pasien berbasis NIK tanpa verifikasi** (lihat 2.2) — NIK bukan rahasia; jangan jadikan satu-satunya kunci akses.
4. **Retensi & audit** — `AuditLog` sudah ada (bagus), tapi belum ada kebijakan retensi otomatis; tambahkan rotasi/arsip log dan log akses data PHI (who viewed what).
5. **Kesesuaian regulasi** — sebagai sistem rumah sakit, pastikan kepatuhan UU PDP (No. 27/2022), PMK rekam medis, dan standar SatuSehat (termasuk *data minimization*, *consent*, dan *right to erasure*). Dokumentasikan DFD & DPIA.

---

## 8. Dependensi & Vulnerabilitas

Berdasarkan laporan `npm audit` yang sudah ada di repo:

- **Backend** (`audit_backend.json`): **22 temuan** — 3 HIGH, 19 MODERATE.
  - HIGH berasal dari rantai `prisma → @prisma/config → deepmerge-ts <8.0.0` (DoS stack exhaustion). Perbaikan: naikkan `prisma` (fix tersedia di `7.10.1`, major upgrade).
  - MODERATE mayoritas dari rantai dev `jest`/`js-yaml`/`sprintf-js` (tidak ter-ekspos di produksi, tetapi tetap di-upgrade).
- **Frontend** (`audit_frontend.json`): **2 HIGH**.
  - `vite <=6.4.3` (CWE-77/78/88 pada `launch-editor` — command execution di mesin build/dev; **di-upgrade ke Vite 7**).
  - `source-map-js <1.2.2` (DoS). Perbaikan tersedia.
- **Tindakan:** jalankan `npm audit` ulang setelah upgrade; integrasikan `npm audit --audit-level=high` ke CI; pertimbangkan SCA tool (Snyk/Dependabot) untuk pemantauan berkelanjutan.

---

## 9. Rencana Aksi (Roadmap Prioritas)

### Fase P0 — Sebelum go-live (0–3 hari)
1. Hapus `backend/setMaster.js` dari git (filter-repo) + rotasi semua secret (JWT, DB, API key, `SETTINGS_ENCRYPTION_KEY`); nonaktifkan akun Master `root@dinamixx.id`.
2. Amankan `GET /api/patient/bookings/:nik` & `GET /api/patient/ticket/:id` (auth berbasis passcode, jangan kembalikan PHI/bukti transfer).
3. Tambahkan auth ke semua route `routes/queue.js`; batasi data publik antrean.
4. Pindahkan/hapus `*.sql`, `server_routes.txt`, `backend/.env`; tambahkan `*.sql` ke `.gitignore`.
5. Aktifkan HTTPS/TLS di nginx + cookie `secure: true`.

### Fase P1 — Minggu 1–2
6. Satukan mekanisme auth (httpOnly cookie) di seluruh frontend; hapus `admin_token` localStorage.
7. Ganti semua `Math.random()` dengan `crypto` (token invite, ID, kode booking).
8. Validasi input eksplisit (Zod) untuk master-data & articles; tutup mass-assignment.
9. Upgrade dependensi (Prisma, Vite, source-map-js) & verifikasi `npm audit`.
10. Batasi Google API key (HTTP referrer) & rotasi key yang bocor.

### Fase P2 — Bulan 1–2
11. Refactor monolith `server.js`; satu `PrismaClient`; hapus kode mati (`index.js`, `rateLimiter.js`, duplikat simrsBridge).
12. Sinkronkan dokumentasi (Postgres) & `.env.example`; perbaiki deployment (healthcheck, migrasi, satu model deploy).
13. Enkripsi PHI at-rest; retensi & audit log; kelengkapan kepatuhan (DPIA, UU PDP, SatuSehat).
14. Tambah test keamanan (auth/RBAC/IDOR/rate-limit) di CI.

---

## 10. Lampiran Bukti (ringkas)

- `backend/setMaster.js:6` → `bcrypt.hash('[REDACTED]', 10)` (ter-tracking, di remote).
- `backend/server.js:140` → `secure: false`; `:706` & `:721` → endpoint pasien publik; `:531` → mass-assignment artikel; `:582` → token invite `Math.random`.
- `backend/routes/queue.js` (seluruhnya) → tanpa `requireAuth`.
- `.env:8` (JWT), `:25` (Google key), `:42` (encryption key); `server_routes.txt` → secret plaintext.
- `backup_yasmin.sql` → `Pendaftaran` berisi nama/HP/NIK + base64 bukti transfer; `AdminUser` berisi hash bcrypt.
- `git remote -v` → `github.com/taufiqrrahmanidid/rsyasmin.git`.
- `audit_backend.json` → 3 HIGH / 19 MODERATE; `audit_frontend.json` → 2 HIGH.
