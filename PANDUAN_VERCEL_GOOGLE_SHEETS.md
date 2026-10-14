# 💍 PANDUAN LENGKAP DEPLOY VERCEL & DATABASE GOOGLE SHEETS
### **ARTHANA Wedding & Events — Running Event Management**

Panduan ini dibuat khusus agar Anda dapat:
1. **Meng-upload proyek ke GitHub dengan aman** (semua password dan kredensial sensitif dijamin tidak bocor ke publik).
2. **Deploy ke Vercel dengan 1 klik** (gratis & cepat).
3. **Mengamankan dashboard di Vercel** sehingga hanya Anda/tim berwenang yang bisa mengaksesnya.
4. **Menghubungkan Google Sheets sebagai database utama** (sinkronisasi 2 arah otomatis).

---

## 🔒 1. Keamanan & Kredensial Sensitif (Anti-Bocor di GitHub)

File-file berikut **SUDAH DILINDUNGI** oleh file [`.gitignore`](file:///d:/mas%20said/.gitignore):
- `.env` & `.env.local` (berisi password & API key Anda).
- `data/local-state.json` (data lokal pengantin & event).
- Folder `node_modules` & file sementara.

> [!IMPORTANT]
> **JANGAN PERNAH** menghapus baris `.env` dan `.env.local` dari file [`.gitignore`](file:///d:/mas%20said/.gitignore). GitHub tidak akan pernah mengunggah file-file ini jika `.gitignore` tetap ada.

---

## 🚀 2. Cara Upload ke GitHub

Buka terminal (PowerShell / Command Prompt) di folder proyek ini:

```bash
# 1. Inisialisasi Git repository (jika belum)
git init

# 2. Tambahkan semua file yang aman ke Git
git add .

# 3. Buat commit pertama
git commit -m "feat: setup secure Arthana Wedding calendar for Vercel"

# 4. Ganti 'main' sebagai branch utama
git branch -M main

# 5. Hubungkan ke repository GitHub Anda (buat repo baru di github.com)
git remote add origin https://github.com/USERNAME-ANDA/NAMA-REPO-ANDA.git

# 6. Push ke GitHub
git push -u origin main
```

---

## ⚡ 3. Cara Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** > **"Project"**.
3. Pilih repository GitHub yang baru saja Anda push, lalu klik **"Import"**.
4. Di bagian **"Environment Variables"**, tambahkan variabel-variabel berikut (lihat juga file [`.env.example`](file:///d:/mas%20said/.env.example)):
   - `ADMIN_USERNAME`: Username login Anda (misal: `admin`)
   - `ADMIN_PASSWORD`: Password rahasia dashboard Anda (misal: `PasswordSuperAman2026!`)
   - `SESSION_SECRET`: Ketik sembarang teks acak panjang untuk enkripsi cookie (misal: `arthana_wedding_secret_token_key_xyz987`)
   - `GOOGLE_SHEETS_SCRIPT_URL`: *(Bisa diisi setelah membuat Google Sheets di Langkah 4)*
5. Klik tombol **"Deploy"**.
6. Dalam waktu kurang dari 1 menit, website Anda sudah aktif dengan URL gratis: `https://nama-project-anda.vercel.app`! 🎉

---

## 📊 4. Cara Menghubungkan Google Sheets sebagai Database

Dashboard ini menggunakan Google Apps Script Web App untuk membaca dan menyimpan data secara langsung ke Google Sheets tanpa perlu akun Google Cloud berbayar atau API yang rumit.

### Langkah-langkah:
1. Buka [Google Drive](https://drive.google.com) dan buat **Google Spreadsheet** baru (beri nama misalnya: `Database Arthana Wedding`).
2. Di Google Sheets, klik menu **Ekstensi (Extensions)** > **Apps Script**.
3. Hapus semua tulisan di editor Apps Script, lalu buka file [`google-apps-script.js`](file:///d:/mas%20said/google-apps-script.js) di folder proyek ini. Salin seluruh isinya dan **Paste** ke editor Apps Script.
4. Klik icon **Simpan (Save)** (ikon disket atau `Ctrl + S`).
5. Di pojok kanan atas, klik tombol biru **"Terapkan" (Deploy)** > **"Penerapan baru" (New deployment)**.
6. Klik icon gerigi di sebelah kiri dan pilih jenis **"Aplikasi web" (Web app)**:
   - **Deskripsi:** `Arthana Wedding Database v1`
   - **Jalankan sebagai (Execute as):** `Saya (email Anda)`
   - **Yang memiliki akses (Who has access):** `Siapa saja (Anyone)` *(Wajib dipilih agar server Vercel dapat berkomunikasi)*
7. Klik tombol **Terapkan (Deploy)**.
8. Berikan izin akses Google akun Anda (**Review permissions** > pilih akun > **Advanced** > **Go to Untitled project (unsafe)** > **Allow**).
9. Anda akan mendapatkan **URL Aplikasi Web** (berakhiran `/exec`), contoh:
   ```
   https://script.google.com/macros/s/AKfycbx_AbCdEf123456789/exec
   ```
10. Salin URL tersebut:
    - **Untuk lokal:** Masukkan ke file [`.env.local`](file:///d:/mas%20said/.env.local) pada baris `GOOGLE_SHEETS_SCRIPT_URL=...`
    - **Untuk Vercel:** Buka dashboard Vercel Anda > **Settings** > **Environment Variables** > tambahkan `GOOGLE_SHEETS_SCRIPT_URL` dengan nilai URL tersebut > klik **Save**, lalu redeploy.

### Hasil di Google Sheets:
Setiap kali Anda menambah, mengedit, mengubah status event (RUNNING, SELESAI), mengisi live notes, atau menambah client, data akan otomatis terisi rapi ke tab-tab Google Sheets:
- 📑 Tab **`Events`**: Daftar lengkap event, jam, PIC, lokasi, status, rundown, dan tim.
- 📑 Tab **`Clients`**: Daftar nama pengantin dan nomor WhatsApp.
- 📑 Tab **`Team`**: Anggota tim beserta peran.
- 📑 Tab **`Tasks`**: Daftar checklist operasional.
- 📑 Tab **`_RawState`**: Backup data otomatis.

---

## 💻 5. Menjalankan di Komputer Lokal

Jika ingin mengetes di komputer sendiri sebelum upload:

```bash
# Jalankan server lokal
npm start
```

Buka browser di: `http://localhost:3000`
- **Username default:** `admin`
- **Password default:** `arthana2026` *(bisa diubah di `.env.local`)*
