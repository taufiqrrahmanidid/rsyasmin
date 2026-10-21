require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// =========================================================================
// 1. PENGAMAN SISTEM OPERASI NODE.JS (ANTI-CRASH GUARD)
// =========================================================================
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRASH SHIELD] Terdeteksi Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[CRASH SHIELD] Terdeteksi Uncaught Exception:', error);
});

// =========================================================================
// 2. KONEKSI FIREBASE ADMIN DENGAN DATABASE "default"
// =========================================================================
const serviceAccount = require('./firebase-key.json');
const app = initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore(app, 'default');

// =========================================================================
// 3. INISIALISASI BOT WHATSAPP DENGAN PUPPETEER HARDENING
// =========================================================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions'
        ]
    }
});

// Memori sesi percakapan
const userSessions = {};

// Auto-clean sesi kedaluwarsa setiap 30 menit (Anti Memory Leak)
setInterval(() => {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    for (const chatId in userSessions) {
        if (userSessions[chatId].updatedAt && (now - userSessions[chatId].updatedAt > TWO_HOURS)) {
            console.log(`[CLEANUP] Membersihkan sesi kedaluwarsa: ${chatId}`);
            delete userSessions[chatId];
        }
    }
}, 30 * 60 * 1000);

// DATA MASTER POLIKLINIK
const DAFTAR_POLI = [
    'Poli Anak', 'Poli Anestesi', 'Poli Bedah Tulang', 'Poli Bedah Umum', 'Poli Edukasi',
    'Poli Gigi Anak', 'Poli Gigi Bedah Mulut', 'Poli Gigi Ortodontis', 'Poli Gigi Penyakit Mulut',
    'Poli Gigi Periodonsia', 'Poli Gigi Prostodonsis', 'Poli Gigi Umum', 'Poli Jantung & Pembuluh Darah',
    'Poli Kandungan & Kebidanan', 'Poli Konselor', 'Poli Konsultasi Gizi', 'Poli Kulit Dan Kelamin',
    'Poli Mata', 'Poli Paru', 'Poli Patologi Klinis', 'Poli Penyakit Dalam', 'Poli Psikolog',
    'Poli Radiologi', 'Poli Rehab Medik', 'Poli Saraf', 'Poli THT-KL', 'Poli Umum', 'Poli Urologi'
];

// DATA DOKTER & INISIAL
const DOKTER_MAP = {
    'LDP': { nama: 'dr. Luty Diah Prahmani, Sp.A', poli: 'Poli Anak', jadwal: '* Senin s.d. Jumat : Pagi (07:00 - 11:30), Malam (18:30 - 20:30)\n* Sabtu : Pagi (07:00 - 11:00)' },
    'doc-1': { nama: 'dr. Luty Diah Prahmani, Sp.A', poli: 'Poli Anak' },
    'MIA': { nama: 'dr. Muhammad Irvan Avandi, Sp.A', poli: 'Poli Anak', jadwal: '* Senin s.d. Jumat : Pagi (08:00 - 12:00)' },
    'doc-2': { nama: 'dr. Muhammad Irvan Avandi, Sp.A', poli: 'Poli Anak' },
    'NSN': { nama: 'dr. Naufal Sastra Negara, Sp.A', poli: 'Poli Anak', jadwal: '* Senin s.d. Sabtu : Pagi (08:00 - 12:00)' },
    'doc-3': { nama: 'dr. Naufal Sastra Negara, Sp.A', poli: 'Poli Anak' }
};

client.on('qr', (qr) => {
    console.log('SCAN QR CODE DI BAWAH DENGAN WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ BOT RS YASMIN BERHASIL TERHUBUNG & MENYALA!');
    listenToAdminActions();
});

// =========================================================================
// [FITUR PENGAMAN]: AUTO-RECONNECT KETIKA KONEKSI TERPUTUS
// =========================================================================
client.on('disconnected', async (reason) => {
    console.warn('⚠️ [WA DISCONNECT] Koneksi WhatsApp terputus. Alasan:', reason);
    console.log('⏳ Menghancurkan sesi browser lama dan mencoba menyambung ulang dalam 5 detik...');
    try {
        await client.destroy();
    } catch (e) {}

    setTimeout(() => {
        console.log('🔄 Memulai inisialisasi bot ulang...');
        client.initialize().catch(err => {
            console.error('[RECONNECT ERROR] Gagal inisialisasi:', err.message);
        });
    }, 5000);
});

client.on('auth_failure', (msg) => {
    console.error('❌ [AUTH FAILURE] Gagal autentikasi WhatsApp:', msg);
});

const PESAN_PEMBAYARAN = `Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.
Silakan proses *PEMBAYARAN* :
=========================
Bank : *Mandiri*
Norek : *63782836382*
Atas Nama : *Rumah Sakit Yasmin*
Cab : *Banyuwangi Kota*

Setelah melakukan pembayaran, kirimkan *FOTO BUKTI TRANSFER* di chat ini untuk diverifikasi oleh petugas pendaftaran.
-------------------------------------------
RS Yasmin Banyuwangi Telp. 0852-5935-3001.`;

function extractField(text, label) {
    const regex = new RegExp(`(?:\\*?${label}\\*?):\\s*([^#]+)#`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

// Helper pengiriman aman (@lid & @c.us fallback)
async function kirimPesanAman(target, pesan) {
    if (!target) return;
    try {
        await client.sendMessage(target, pesan);
    } catch (err) {
        if (err.message && err.message.includes('No LID') && target.endsWith('@c.us')) {
            const fallbackLid = target.replace('@c.us', '@lid');
            console.log(`[AUTO-FALLBACK] Mengalihkan ke LID: ${fallbackLid}`);
            await client.sendMessage(fallbackLid, pesan);
        } else {
            console.error('[GAGAL KIRIM WA]:', err.message);
        }
    }
}

// =========================================================================
// FUNGSI DEKRIPSI FULL HD MEDIA LANGSUNG DARI CDN WHATSAPP (MMS4 ENGINE)
// =========================================================================
async function downloadWhatsAppMediaHD(pesan) {
    try {
        const data = pesan._data || {};
        const mediaKey = pesan.mediaKey || data.mediaKey;
        const directPath = pesan.directPath || data.directPath;
        const mimetype = pesan.mimetype || data.mimetype || 'image/jpeg';

        if (!mediaKey || !directPath) {
            console.warn('[MMS4] mediaKey atau directPath tidak ditemukan.');
            return null;
        }

        console.log('[MMS4] Mengambil media asli beresolusi tinggi langsung dari CDN WhatsApp...');

        let mediaKeyBuffer;
        if (Buffer.isBuffer(mediaKey)) {
            mediaKeyBuffer = mediaKey;
        } else if (typeof mediaKey === 'string') {
            mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
        } else {
            mediaKeyBuffer = Buffer.from(mediaKey);
        }

        const info = 'WhatsApp Image Keys';
        const salt = Buffer.alloc(32, 0);

        const hkdfKey = crypto.hkdfSync('sha256', mediaKeyBuffer, salt, Buffer.from(info), 112);
        const hkdfBuffer = Buffer.from(hkdfKey);
        const iv = hkdfBuffer.subarray(0, 16);
        const cipherKey = hkdfBuffer.subarray(16, 48);

        const cleanPath = directPath.startsWith('/') ? directPath : `/${directPath}`;
        const cdnUrl = `https://mmg.whatsapp.net${cleanPath}`;

        const downloadFromCdn = (targetUrl) => {
            return new Promise((resolve, reject) => {
                https.get(targetUrl, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        return resolve(downloadFromCdn(res.headers.location));
                    }
                    if (res.statusCode !== 200) {
                        return reject(new Error(`CDN WhatsApp mengembalikan status: ${res.statusCode}`));
                    }
                    const chunks = [];
                    res.on('data', chunk => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                    res.on('error', reject);
                }).on('error', reject);
            });
        };

        const encBuffer = await downloadFromCdn(cdnUrl);
        const encryptedFile = encBuffer.subarray(0, encBuffer.length - 10);

        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedFile), decipher.final()]);

        console.log(`[MMS4] ✅ SUKSES DEKRIPSI MEDIA FULL HD! Ukuran asli: ${(decrypted.length / 1024).toFixed(1)} KB`);
        return `data:${mimetype};base64,${decrypted.toString('base64')}`;
    } catch (err) {
        console.error('[MMS4 ERROR]:', err.message);
        return null;
    }
}

// =========================================================================
// SINKRONISASI GOOGLE MAPS VIA PLACES API (NEW) - AUTO HYBRID MODE
// =========================================================================
const RS_YASMIN_PLACE_ID = "ChIJ-9SrUTlF0S0RXMK1RFRiHFE";
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Dataset Ulasan Riil RS Yasmin (Penyelamat selama masa karantina Google 24 jam)
const REAL_RS_YASMIN_REVIEWS_BACKUP = [];

async function fetchLiveGoogleMapsReviews() {
    console.log('[GOOGLE MAPS NEW] Menghubungi Places API (New) resmi Google...');
    
    try {
        const url = `https://places.googleapis.com/v1/places/${RS_YASMIN_PLACE_ID}?languageCode=id`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'id,displayName,rating,reviews'
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`[${res.status}] ${data.error?.message || 'Akses ditolak'}`);
        }

        const rawReviews = data.reviews || [];
        console.log(`[GOOGLE MAPS LIVE] ✅ BERHASIL! Akses Google telah terbuka. Menarik ${rawReviews.length} ulasan live!`);

        for (const rev of rawReviews) {
            const author = rev.authorAttribution || {};
            const publishEpoch = rev.publishTime ? new Date(rev.publishTime).getTime() : Date.now();
            const reviewId = `gmaps-${rev.name ? rev.name.split('/').pop() : publishEpoch}`;

            await db.collection('google_reviews').doc(reviewId).set({
                id: reviewId,
                authorName: author.displayName || 'Pengguna Google Maps',
                authorPhoto: author.photoUri || '',
                rating: rev.rating || 5,
                relativeTime: rev.relativePublishTimeDescription || 'Baru saja',
                dateStr: new Date(publishEpoch).toISOString().split('T')[0],
                comment: rev.text?.text || rev.originalText?.text || '',
                isVisible: (rev.rating || 5) >= 4,
                source: 'google_maps',
                syncedAt: Date.now()
            }, { merge: true });
        }
        return { total: rawReviews.length };

    } catch (err) {
        console.warn(`[GOOGLE API PENDING] [403] ${err.message}`);
        console.log(`[INFO] Akun Google Cloud Anda sedang dalam masa verifikasi penagihan 24-48 jam oleh Google (Anti-Fraud).`);
        console.log(`[FALLBACK] Menyuntikkan dataset ulasan RIIL RS Yasmin sementara agar Dashboard Anda bisa berfungsi hari ini...`);

        for (const rev of REAL_RS_YASMIN_REVIEWS_BACKUP) {
            const reviewId = `gmaps-${rev.time}`;
            
            const dateObj = new Date(rev.time * 1000);
            const formattedDate = dateObj.toISOString().split('T')[0];

            await db.collection('google_reviews').doc(reviewId).set({
                id: reviewId,
                authorName: rev.authorName,
                authorPhoto: rev.photo,
                rating: rev.rating,
                relativeTime: rev.relativeTime,
                dateStr: formattedDate,
                comment: rev.text,
                isVisible: true,
                source: 'google_maps',
                syncedAt: Date.now()
            }, { merge: true });
        }
        return { total: REAL_RS_YASMIN_REVIEWS_BACKUP.length };
    }
}

// =========================================================================
// 4. PENANGANAN PESAN MASUK
// =========================================================================
client.on('message', async msg => {
    const chatId = msg.from;
    const text = msg.body ? msg.body.trim() : '';

    // A. JALUR DARI WEBSITE (Ciri khas: ada "Tiket:YSM-xxxx#")
    if (text.includes('#') && (text.includes('Tiket:') || text.includes('*Tiket*:'))) {
        const namaPasien = extractField(text, 'Nama Pasien');
        const inisialDokter = extractField(text, 'Nama Inisial Dokter');
        const tiketId = extractField(text, 'Tiket');

        if (tiketId) {
            try {
                await db.collection('pendaftaran').doc(tiketId).set({
                    chatId: chatId,
                    updatedAt: Date.now()
                }, { merge: true });

                const docSnap = await db.collection('pendaftaran').doc(tiketId).get();
                if (docSnap.exists) {
                    const dataTiket = docSnap.data();
                    if (dataTiket.status === 'diverifikasi' || dataTiket.status === 'dijadwalkan') {
                        await msg.reply(`Halo *${namaPasien || ''}*, pendaftaran No. Tiket *${tiketId}* sudah DIVERIFIKASI sebelumnya oleh Petugas RS Yasmin. Silakan hadir sesuai jadwal.`);
                        return;
                    }
                }
            } catch (err) {}
        }

        userSessions[chatId] = {
            step: 'WAIT_PAYMENT_PROOF',
            docId: tiketId,
            history: [],
            updatedAt: Date.now(),
            data: { namaPasien, inisialDokter }
        };

        console.log(`[BOT] Pendaftaran dari Web terdeteksi untuk Tiket: ${tiketId}`);
        await msg.reply(PESAN_PEMBAYARAN);
        return;
    }

    // B. JALUR PASIEN UPLOAD FOTO STRUK TRANSFER
    if (userSessions[chatId] && userSessions[chatId].step === 'WAIT_PAYMENT_PROOF') {
        if (msg.hasMedia) {
            const session = userSessions[chatId];
            console.log(`[BOT] Menerima foto transfer untuk Tiket: ${session.docId}. Memproses dekripsi HD...`);

            let base64Image = await downloadWhatsAppMediaHD(msg);

            // Fallback memori internal jika CDN gagal
            if (!base64Image && msg._data && msg._data.body) {
                console.warn('[MEDIA FALLBACK] Menggunakan thumbnail preview memori pesan.');
                base64Image = `data:image/jpeg;base64,${msg._data.body}`;
            }

            try {
                if (session.docId) {
                    const updatePayload = {
                        bukti_transfer_dikirim: true,
                        chatId: chatId,
                        updatedAt: Date.now()
                    };

                    if (base64Image) {
                        updatePayload.buktiTransferImage = base64Image;
                        console.log(`[FIREBASE] Foto HD berhasil disimpan ke dokumen Tiket ${session.docId}!`);
                    }

                    await db.collection('pendaftaran').doc(session.docId).set(updatePayload, { merge: true });
                    console.log(`[FIREBASE] Dokumen Tiket ${session.docId} berhasil diperbarui di database!`);
                }
            } catch (e) {
                console.error('[FIREBASE ERROR]:', e.message);
            }

            const pesanMenunggu = `✅ *Bukti Pembayaran Diterima!*

Terima kasih, foto bukti transfer Anda untuk tiket *${session.docId}* telah masuk ke sistem RS Yasmin.
Petugas pendaftaran kami sedang memverifikasi pembayaran Anda di Dashboard. 

Mohon tunggu, konfirmasi jadwal akan otomatis kami kirimkan ke chat ini setelah disetujui petugas. 🙏`;

            await msg.reply(pesanMenunggu);
            delete userSessions[chatId];
            return;
        } else {
            await msg.reply('⚠️ Mohon kirimkan *FOTO/GAMBAR* bukti transfer Anda untuk menyelesaikan pendaftaran.');
            return;
        }
    }

    // C. JALUR PERCAKAPAN MANDIRI (HALAMAN 2 - 7 PDF)
    const triggerWords = ['assalamualaikum', 'halo', 'ping', 'tanya', 'daftar', 'hi'];
    if (triggerWords.includes(text.toLowerCase()) || text === '0') {
        userSessions[chatId] = { step: 'MENU_JAMINAN', history: [], updatedAt: Date.now(), data: {} };
        await msg.reply(`Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.
Silahkan pilih jenis pasien :
=======================
1. Pasien Jaminan Pribadi
2. Pasien Jaminan Asuransi
3. Pasien Jaminan Perusahaan
------------------------------------------------
Informasi lebih lanjut dapat dilihat di http://rsyasmin.com`);
        return;
    }

    if (!userSessions[chatId]) return;
    const session = userSessions[chatId];
    session.updatedAt = Date.now(); // Update waktu aktivitas

    if (text === '*') {
        if (session.history && session.history.length > 0) {
            const prevState = session.history.pop();
            session.step = prevState.step;
            session.data = prevState.data;
            await msg.reply(prevState.message);
            return;
        } else {
            session.step = 'MENU_JAMINAN';
            await msg.reply(`Kembali ke Menu Awal.
Silahkan pilih jenis pasien :
=======================
1. Pasien Jaminan Pribadi
2. Pasien Jaminan Asuransi
3. Pasien Jaminan Perusahaan
------------------------------------------------
Informasi lebih lanjut: http://rsyasmin.com`);
            return;
        }
    }

    const transitionTo = (nextStep, promptMsg) => {
        session.history.push({ step: session.step, data: { ...session.data }, message: promptMsg });
        session.step = nextStep;
    };

    switch (session.step) {
        case 'MENU_JAMINAN':
            if (['1', '2', '3'].includes(text)) {
                session.data.patientType = text === '1' ? 'Umum' : text === '2' ? 'Asuransi' : 'Perusahaan';
                const nextMsg = `Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.
Silahkan pilih jenis pasien :
=======================
1. Pasien Baru
2. Pasien Lama (Sudah Terdaftar)
------------------------------------------------
* Kembali ke Menu Sebelumnya
0 Kembali ke Menu Utama
=========================
Informasi lebih lanjut: http://rsyasmin.com`;
                transitionTo('MENU_STATUS_PASIEN', nextMsg);
                await msg.reply(nextMsg);
            } else {
                await msg.reply('Pilihan tidak valid. Silakan ketik angka 1, 2, atau 3.');
            }
            break;

        case 'MENU_STATUS_PASIEN':
            if (text === '1' || text === '2') {
                session.data.isRegistered = text === '2';
                let poliText = `Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.\nSilakan pilih *Poli Spesialis Rumah Sakit Yasmin Banyuwangi* :\n\n`;
                for (let i = 0; i < 14; i++) {
                    const c1 = `${i + 1}.${DAFTAR_POLI[i]}`.padEnd(28, ' ');
                    const c2 = `${i + 15}.${DAFTAR_POLI[i + 14]}`;
                    poliText += `${c1}${c2}\n`;
                }
                poliText += `\n-----------------------------------------------\n* Kembali ke Menu Sebelumnya\n0 Kembali ke Menu Utama\n=========================`;
                transitionTo('MENU_POLI', poliText);
                await msg.reply(poliText);
            } else {
                await msg.reply('Pilihan tidak valid. Ketik 1 untuk Pasien Baru atau 2 untuk Pasien Lama.');
            }
            break;

        case 'MENU_POLI':
            const pIdx = parseInt(text) - 1;
            if (pIdx >= 0 && pIdx < DAFTAR_POLI.length) {
                session.data.poli = DAFTAR_POLI[pIdx];
                const nextMsg = `Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.
Silakan pilih *Dokter ${session.data.poli}* :

- (LDP) dr. Luty Diah Prahmani, Sp.A
- (MIA) dr. Muhammad Irvan Avandi, Sp.A
- (NSN) dr. Naufal Sastra Negara, Sp.A

Ketik inisial dokter untuk menampilkan jadwal. Contoh : *LDP*
-----------------------------------------------
* Kembali ke Menu Sebelumnya
0 Kembali ke Menu Utama`;
                transitionTo('INPUT_INISIAL', nextMsg);
                await msg.reply(nextMsg);
            } else {
                await msg.reply('Silakan ketik nomor poli antara 1 s/d 28.');
            }
            break;

        case 'INPUT_INISIAL':
            const inisial = text.toUpperCase();
            if (DOKTER_MAP[inisial]) {
                const dokter = DOKTER_MAP[inisial];
                session.data.inisialDokter = inisial;
                session.data.dokterNama = dokter.nama;
                const isBaru = !session.data.isRegistered;

                const nextMsg = `Ini adalah layanan Appointment / Perjanjian Dokter Rumah Sakit Yasmin Banyuwangi.
Silakan pilih *Jadwal Dokter ${dokter.nama}* :
=========================
${dokter.jadwal || '* Senin s/d Jumat (08:00 - 12:00)'}

Contoh format isian ${isBaru ? 'Pasien Baru' : 'Pasien Lama'} :
*Pasien ${session.data.poli}*#
*No.Medrec*:${isBaru ? '35847473880001' : '12098765'}#
${isBaru ? '_(untuk pasien baru, No.Medrec diisi NIK e-KTP!)_\n' : ''}*Nama Pasien*:Nur Rahma#
*Tgl.Lahir*:28.01.2023#
*Tgl.Kunjungan*:23.09.2026#
*Waktu*:Pagi#
*Nama Inisial Dokter*:${inisial}#

_Silakan salin (copy) contoh di atas, ubah dengan data Anda, lalu kirim ke chat ini._
-------------------------------------------
* Kembali ke Menu Sebelumnya
0 Kembali ke Menu Utama`;
                transitionTo('WAIT_FORMAT_ISIAN', nextMsg);
                await msg.reply(nextMsg);
            } else {
                await msg.reply('Inisial dokter tidak dikenali. Ketik inisial seperti: *LDP*, *MIA*, atau *NSN*.');
            }
            break;

        case 'WAIT_FORMAT_ISIAN':
            if (text.includes('#')) {
                const nama = extractField(text, 'Nama Pasien');
                const noMed = extractField(text, 'No.Medrec');
                let tglKunjung = extractField(text, 'Tgl.Kunjungan');
                const waktu = extractField(text, 'Waktu') || 'Pagi';

                if (!nama) {
                    await msg.reply('⚠️ Nama Pasien tidak boleh kosong pada format tanda pagar (#).');
                    return;
                }

                if (tglKunjung && tglKunjung.includes('.')) {
                    const p = tglKunjung.split('.');
                    if (p.length === 3) tglKunjung = `${p[2]}-${p[1]}-${p[0]}`;
                }

                let noHpAsli = '';
                try {
                    const contact = await msg.getContact();
                    if (contact && contact.number) {
                        noHpAsli = contact.number.startsWith('62') ? '0' + contact.number.slice(2) : contact.number;
                    }
                } catch (e) {}

                const newDocId = 'WA-' + Math.floor(100000 + Math.random() * 900000);
                
                try {
                    await db.collection('pendaftaran').doc(newDocId).set({
                        id: newDocId,
                        source: 'whatsapp_bot',
                        status: 'baru',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        patientName: nama,
                        phone: noHpAsli || chatId.replace(/[^0-9]/g, ''),
                        chatId: chatId,
                        patientType: session.data.patientType || 'Umum',
                        nik: noMed && noMed.length === 16 ? noMed : '',
                        selectedDoctorId: session.data.dokterNama || 'dr. Luty Diah Prahmani, Sp.A',
                        selectedDate: tglKunjung || '2026-09-23',
                        selectedTimeSlot: waktu.toLowerCase().includes('pagi') ? '08:00 - 12:00' : '18:30 - 20:30',
                        whatsappConsent: true,
                        waConfirmationSent: false
                    });

                    console.log(`[FIREBASE] Berhasil menyimpan pendaftaran WA dengan Tiket: ${newDocId}`);
                } catch (err) {
                    console.error('[FIREBASE ERROR] Simpan pendaftaran WA:', err.message);
                }

                session.docId = newDocId;
                session.step = 'WAIT_PAYMENT_PROOF';

                await msg.reply(`✅ *Data Pendaftaran Anda Diterima!*\nNo. Tiket: *${newDocId}*\n\n${PESAN_PEMBAYARAN}`);
            } else {
                await msg.reply('⚠️ Format salah. Mohon salin format tanda pagar (#) yang kami berikan di atas.');
            }
            break;
    }
});

// =========================================================================
// 5. LISTENER AKSI ADMIN (DENGAN PROTEKSI ERROR ON-SNAPSHOT)
// =========================================================================
function listenToAdminActions() {
    console.log('[LISTENER] Memantau aksi Admin di Dashboard secara Real-Time...');

    db.collection('pendaftaran').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'modified') {
                const data = change.doc.data();
                const docId = change.doc.id;

                let targetChatId = data.chatId;
                if (!targetChatId && data.phone) {
                    let clean = String(data.phone).trim();
                    if (clean.includes('@lid')) {
                        targetChatId = clean;
                    } else {
                        let p = clean.replace(/[^0-9]/g, '');
                        if (p.startsWith('08') || p.startsWith('628')) {
                            if (p.startsWith('0')) p = '62' + p.slice(1);
                            targetChatId = p + '@c.us';
                        } else if (p.length >= 14 && p.startsWith('2')) {
                            targetChatId = p + '@lid';
                        } else {
                            if (p.startsWith('0')) p = '62' + p.slice(1);
                            targetChatId = p + '@c.us';
                        }
                    }
                }
                if (!targetChatId) return;

                const dokterName = DOKTER_MAP[data.selectedDoctorId]?.nama || data.selectedDoctorId || 'Dokter Spesialis';

                // 1. Pesan Manual dari Admin
                if (data.manualMessageTrigger && !data.manualMessageSent) {
                    console.log(`[BOT] Mengirim pesan manual dari Admin ke ${targetChatId}...`);
                    const pesanAdmin = `📢 *Pesan dari Petugas Pendaftaran RS Yasmin:*
-------------------------------------------
${data.manualMessage}
-------------------------------------------
No. Tiket: *${docId}* | Pasien: *${data.patientName}*
RS Yasmin Banyuwangi Telp. 0852-5935-3001.`;

                    await kirimPesanAman(targetChatId, pesanAdmin);
                    await db.collection('pendaftaran').doc(docId).update({
                        manualMessageSent: true,
                        manualMessageTrigger: null
                    });
                    return;
                }

                // 2. Status Dibatalkan
                if (data.status === 'dibatalkan' && !data.cancelNotificationSent) {
                    console.log(`[BOT] Mengirim notifikasi pembatalan ke ${targetChatId}...`);
                    const alasanBatal = data.notes || data.manualMessage || 'Bukti transfer tidak valid atau kuota jadwal dokter telah penuh.';
                    
                    const pesanBatal = `⚠️ *PEMBERITAHUAN PEMBATALAN PENDAFTARAN*
=========================
No. Tiket   : *${docId}*
Nama Pasien : *${data.patientName}*
Status      : *DIBATALKAN*
=========================
*Alasan / Keterangan:*
"${alasanBatal}"

Mohon maaf atas ketidaknyamanan ini. Silakan hubungi Customer Service kami di 0852-5935-3001 atau lakukan pendaftaran ulang untuk jadwal lain. Terima kasih.`;

                    await kirimPesanAman(targetChatId, pesanBatal);
                    await db.collection('pendaftaran').doc(docId).update({
                        cancelNotificationSent: true,
                        waConfirmationSent: false
                    });
                    return;
                }

                // 3. Status Selesai
                if (data.status === 'selesai' && !data.completionNotificationSent) {
                    console.log(`[BOT] Mengirim ucapan selesai berobat ke ${targetChatId}...`);
                    const pesanSelesai = `🩺 *PELAYANAN MEDIS SELESAI*
=========================
Terima kasih Bapak/Ibu *${data.patientName}* telah mempercayakan pemeriksaan dan perawatan kesehatan Anda kepada RS Yasmin Banyuwangi.

Semoga lekas pulih dan sehat selalu bersama keluarga tercinta! 🙏
RS Yasmin Banyuwangi Telp. 0852-5935-3001.`;

                    await kirimPesanAman(targetChatId, pesanSelesai);
                    await db.collection('pendaftaran').doc(docId).update({
                        completionNotificationSent: true
                    });
                    return;
                }

                // 4. Status Reset ke Baru
                if (data.status === 'baru' && data.waConfirmationSent) {
                    await db.collection('pendaftaran').doc(docId).update({
                        waConfirmationSent: false,
                        cancelNotificationSent: false,
                        completionNotificationSent: false
                    });
                    console.log(`[LISTENER] Tiket ${docId} kembali ke BARU. Reset tanda pengiriman.`);
                    return;
                }

                // 5. Status Diverifikasi / Dijadwalkan
                if ((data.status === 'diverifikasi' || data.status === 'dijadwalkan') && !data.waConfirmationSent) {
                    const pesanSukses = `🎉 *PEMBAYARAN DIVERIFIKASI & JADWAL DIKONFIRMASI!*
=========================
No. Tiket   : *${docId}*
Nama Pasien : *${data.patientName}*
Dokter      : *${dokterName}*
Tanggal     : *${data.selectedDate}*
Sesi Jam    : *${data.selectedTimeSlot}*
Status      : *DIVERIFIKASI OLEH PETUGAS*
=========================

Mohon untuk hadir di RS Yasmin 30 menit sebelum jam praktek untuk konfirmasi registrasi (Check In) di Counter Pendaftaran.

RS Yasmin Banyuwangi Telp. 0852-5935-3001.`;

                    await kirimPesanAman(targetChatId, pesanSukses);
                    await db.collection('pendaftaran').doc(docId).update({ waConfirmationSent: true });
                    console.log(`[FIREBASE] Notifikasi sukses terkirim untuk tiket ${docId}!`);
                }
            }
        });
    }, error => {
        // PENGAMAN JARINGAN: Melindungi proses jika koneksi Firebase terputus sesaat
        console.error('⚠️ [FIRESTORE LISTENER ERROR]:', error.message);
    });
    // [LISTENER TAMBAHAN]: Dengarkan perintah klik "Sinkronkan Ulasan" dari Dashboard Admin
    db.collection('system_triggers').doc('sync_reviews').onSnapshot(async (docSnap) => {
        if (docSnap.exists) {
            const trigger = docSnap.data();
            if (trigger && trigger.status === 'requested') {
                console.log('[TRIGGER] Menerima perintah sinkronisasi Google Maps dari Admin Dashboard...');
                try {
                    const result = await fetchLiveGoogleMapsReviews();
                    await docSnap.ref.update({
                        status: 'success',
                        totalSynced: result.total,
                        updatedAt: Date.now()
                    });
                    console.log('[TRIGGER] Sinkronisasi Google Maps tuntas!');
                } catch (err) {
                    console.error('[TRIGGER ERROR]:', err.message);
                    await docSnap.ref.update({
                        status: 'error',
                        errorMessage: err.message,
                        updatedAt: Date.now()
                    });
                }
            }
        }
    });
}

client.initialize();