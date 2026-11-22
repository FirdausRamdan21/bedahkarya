# BedahKarya

Platform komunitas kreatif berbasis web untuk berbagi karya, membedah desain/kode/edukasi, berdiskusi secara konstruktif, serta mengikuti event komunitas dalam lingkungan yang terkurasi dan aman.

---

## Fitur Utama

- **Beranda & Feed Terkurasi**:
  - Tab **Untuk Anda** & **Mengikuti** dengan *infinite scroll* otomatis dan *pull-to-refresh*.
  - Filter **Kategori Konten** (*Konten Karya*, *Konten Meme*, *Konten Teknis*, *Konten Pendidikan*, *Konten Sosial*, plus kategori dinamis dari Panel Spesial) dan **Subkategori**.
  - Banner **Event Komunitas** aktif langsung di atas linimasa.
- **Eksplorasi & Smart Search (`/search`)**:
  - Pencarian terpadu mendukung teks bebas, `#tag`, `@username`, kategori, subkategori, dan event.
  - Panel saran otomatis: riwayat pencarian (maks. 5), tren pencarian populer, saran `@akun` (memprioritaskan akun yang diikuti), dan `#tag` populer.
- **Unggah & Editor Media (`/upload`)**:
  - Mode **Gambar** (Portrait `4:5` dan Landscape `16:9` lengkap dengan kanvas *crop/pan/zoom* serta mode utuh `#1E293B`) atau **Hanya Teks** (kartu editorial `#CBD5E1`).
  - Dukungan **Simpan Draf**, jadwal waktu upload, tag `#`, `@mentions`, tautan eksternal, opsi sembunyikan jumlah suka (*Mode Fokus*), serta pemilihan **Subkategori** dan **Event Komunitas**.
  - Validasi anti-tautan pada judul dan peringatan keamanan (*External Link Warning*) sebelum membuka tautan keluar.
- **Detail Karya & Diskusi Konstruktif (`/post/[id]`)**:
  - Tata letak adaptif: *Landscape* menampilkan profil & diskusi di bawah media; *Portrait/Teks* menampilkan di sisi kanan.
  - Ulasan & komentar dilengkapi sistem penandaan **Pengulas Konstruktif** dan **Badge Spesial**.
  - Fitur **Simpan (Bookmark)** ke profil, **Bagikan** (tautan, WhatsApp, Telegram), dan **Laporkan** (dengan lampiran screenshot bukti).
- **Pesan Langsung / DM (`/messages`) & Pengumuman (`/notifications`)**:
  - DM khusus antar pengguna yang saling mengikuti (atau telah diikuti), mendukung pengiriman teks, gambar, dan balas konten langsung ke DM.
  - Pusat pengumuman terkategori: *Sistem*, *Pengumuman Admin*, *Peringatan*, *Interaksi*, dan *Riwayat*.
- **Pengaturan Akun & Dark Mode (`/settings`)**:
  - Preferensi **Mode Terang / Gelap** per akun, mode fokus suka bawaan, serta pengaturan privasi DM.
- **Panel Admin & Moderator (`/admin`)**:
  - **Ringkasan**, **Kelola Pengguna** (ubah peran ke Moderator khusus Admin; penangguhan berdurasi *hari/bulan/tahun* atau permanen), **Kelola Konten** (peringatan `1/2`, pelanggaran, hapus), **Laporan**, dan **Uji Banding** (`/admin/appeals` — pengguna tertangguhkan dapat mengirim alasan + 1–3 foto bukti untuk ditinjau & dibebaskan).
  - **Panel Spesial (`/admin/special`)**: Admin & Moderator dapat membuat serta menyematkan **Badge Spesial** (*Si Jenius*, *Si Keren*, *Si Mekanik*, *Si Motivator*, *Si Master*, *Si Influencer*, dll.), menambah/menghapus **Kategori & Subkategori**, serta mengelola **Event Komunitas** (*Pembukaan Baru*, *Inspirasi*, dll.).

---

## Teknologi yang Digunakan

- **Framework**: Next.js 15 (App Router), React 19
- **Styling & Ikon**: Tailwind CSS v4, Lucide React
- **Database & ORM**: MySQL + Prisma ORM v6
- **Autentikasi & Keamanan**: JWT (`jose`), `bcryptjs`, proteksi media (`bk-protected-media`), validasi RBAC (*Admin*, *Moderator*, *User*, *Guest*)

---

## Persiapan & Menjalankan Secara Lokal

### 1. Prasyarat
- Node.js 18+ (disarankan Node.js 20+)
- MySQL Server (misalnya Laragon / XAMPP / MySQL 8)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment
Salin `.env.example` menjadi `.env`, lalu sesuaikan koneksi database dan secret key:
```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/bedahkarya"
JWT_SECRET="ganti-dengan-secret-key-acak-minimal-32-karakter"
NEXT_PUBLIC_APP_NAME="BedahKarya"
```

### 4. Sinkronisasi Database & Seed Data Awal
```bash
npx prisma db push
npm run db:seed
```
> **Catatan**: Skrip `prisma/seed.js` menggunakan *upsert* non-destruktif sehingga aman dijalankan tanpa menghapus data pengguna atau konten yang sudah ada.

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka `http://localhost:3000` di browser.

### Perintah Tambahan
- `npm run build` — Build aplikasi untuk produksi.
- `npm run start` — Menjalankan hasil build produksi.
- `npm run clean` — Menghapus folder cache `.next`.
- `npm run db:studio` — Membuka Prisma Studio untuk melihat isi database.

---

## Struktur Direktori Utama

```text
bedahkarya/
├── docs/                  # Dokumentasi Use Case, Workflow, dan Perencanaan
├── prisma/
│   ├── schema.prisma      # Skema database MySQL (19 model + 8 enum)
│   └── seed.js            # Data awal kategori, subkategori, badge, event, & akun default
├── public/uploads/        # Penyimpanan media unggahan lokal
└── src/
    ├── app/
    │   ├── (auth)/        # Halaman /login & /register
    │   ├── (public)/      # Beranda, Eksplorasi, Event, Unggah, Detail, Profil, DM, Notifikasi, Pengaturan
    │   ├── admin/         # Panel Administrator & Moderator (/admin, users, contents, reports, appeals, special)
    │   └── api/           # Endpoint REST API Next.js Route Handlers
    ├── components/        # Komponen UI publik & panel admin
    ├── lib/               # Helper auth, prisma, taxonomy cache, posts, categories, notifications
    └── services/          # Algoritma feed & pengolahan tag
```

---

## Dokumentasi Lengkap

- [Dokumen Use Case](docs/USE_CASE.md)
- [Dokumen Workflow & Alur Sistem](docs/WORKFLOW.md)
- [Dokumen Perencanaan Proyek](docs/PERENCANAAN.md)
