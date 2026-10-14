# ARTHANA Wedding & Events — Running Event Management

Dashboard operasional dan kalender manajemen acara pernikahan untuk **ARTHANA Wedding & Events**. Siap di-deploy ke Vercel dengan database Google Sheets dan sistem keamanan serverless.

## Fitur Utama
- 🔒 **Serverless Authentication**: Proteksi akses login di level server via HTTP-Only cookies. Data pengantin dan jadwal tidak akan pernah bocor ke orang yang tidak memiliki izin.
- 📊 **Database Google Sheets**: Sinkronisasi 2 arah otomatis ke Google Spreadsheet secara realtime tanpa biaya cloud tambahan.
- 📅 **Kalender & Event Control Center**: Tampilan kalender Bulanan, Mingguan, Harian, Stopwatch running event, checklist operasional, dan live notes.
- 🎨 **Luxury Executive Design**: Desain modern, responsif untuk HP/Laptop, tema elegan khas brand ARTHANA, serta performa super cepat.
- 🛡️ **Anti-Leak GitHub**: Konfigurasi `.gitignore` ketat untuk menjaga file `.env` dan kredensial sensitif tetap privat.

## Cara Menjalankan di Komputer Lokal

```bash
# Jalankan aplikasi di lokal
npm start
```

Buka di browser: [http://localhost:3000](http://localhost:3000)
- Username default: `admin`
- Password default: `arthana2026` (atur di file `.env.local`)

## Panduan Deploy ke Vercel & Setup Google Sheets
Silakan baca panduan lengkap berbahasa Indonesia di:
👉 [**PANDUAN_VERCEL_GOOGLE_SHEETS.md**](./PANDUAN_VERCEL_GOOGLE_SHEETS.md)
