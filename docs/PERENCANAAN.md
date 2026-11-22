# Dokumen Perencanaan Proyek — BedahKarya

Dokumen ini merangkum perencanaan arsitektur, ruang lingkup fitur, desain visual, model data, serta rencana pengembangan **BedahKarya**.

---

## 1. Latar Belakang & Tujuan

Banyak platform media sosial kreatif hanya berfokus pada tampilan visual dan jumlah *likes*, sehingga diskusi substansial mengenai proses desain, kode, maupun konsep karya sering tenggelam. **BedahKarya** dirancang untuk menyediakan ruang berbagi karya sekaligus ulasan konstruktif yang rapi, terstruktur per kategori/subkategori, dan dilengkapi tata kelola komunitas yang transparan.

**Tujuan Utama:**
1. Memfasilitasi kreator mempublikasikan karya gambar (*Portrait 4:5* & *Landscape 16:9*) maupun tulisan (*Hanya Teks*) secara terarah.
2. Mendorong umpan balik berkualitas melalui fitur *Ulasan Konstruktif*, opsi menyembunyikan jumlah suka, dan *Badge Spesial*.
3. Menyediakan pengawasan komunitas yang adil melalui peringatan bertahap, penangguhan berdurasi, serta mekanisme *Uji Banding* berbasis bukti.

---

## 2. Ruang Lingkup Pengembangan (Milestone & Revisi)

| Tahap | Cakupan Fitur | Status |
| --- | --- | --- |
| **Fondasi & Auth** | Skema Prisma MySQL, registrasi/login JWT (`jose` + `bcryptjs`), proteksi rute, manajemen sesi. | Selesai |
| **Revisi #1 (Publik & Eksplorasi)** | Navbar kategori konten, filter beranda, *Smart Search* (`#tag`, `@akun`, riwayat, tren), caption 1-klik, simpan (bookmark), bagikan, tautan eksternal dengan peringatan, laporan + screenshot, layout adaptif Portrait vs Landscape. | Selesai |
| **Revisi #2 (Tema, Role, Banding & DM)** | Tema profesional `#2563EB` / `#3B82F6` / `#F8FAFC` / `#1E293B` / `#CBD5E1`, *Dark Mode* per akun, *infinite scroll* & *pull-to-refresh*, peran `MODERATOR`, penangguhan berdurasi, Uji Banding 1–3 foto, pusat Pengumuman, dan DM antar pengikut. | Selesai |
| **Revisi Final (Panel Spesial & Optimasi)** | Perbaikan duplikat menu admin, update skema non-destruktif (`prisma-v3`), Panel Spesial (`Badge Spesial`, `Kategori & Subkategori` dinamis, `Event Komunitas`), caching `React.cache` & `unstable_cache`, paginasi SQL langsung, serta lazy-load modal. | Selesai |

---

## 3. Sistem Desain & Identitas Visual

| Elemen | Mode Terang | Mode Gelap | Fungsi |
| --- | --- | --- | --- |
| **Navbar** | `#3B82F6` | `#1E293B` | Navigasi utama atas |
| **Aksen Utama** | `#2563EB` | `#2563EB` | Tombol utama, tautan aktif, indikator, badge |
| **Latar Halaman** | `#F8FAFC` | `#0F172A` | Latar belakang kanvas halaman |
| **Teks & Bingkai Media** | `#1E293B` | `#F8FAFC` (teks) / `#1E293B` (media) | Keterbacaan teks & latar gambar *letterbox* |
| **Kartu Konten Teks** | `#CBD5E1` | `#334155` | Latar khusus konten tanpa gambar (*Hanya Teks*) |
| **Bahaya / Hapus / Peringatan** | `red-600` | `red-600` | Khusus tombol hapus, peringatan keamanan, dan pelanggaran |

---

## 4. Arsitektur Data (Skema Database MySQL / Prisma)

Database terdiri dari **19 model** utama yang dikelompokkan sebagai berikut:

1. **Pengguna & Sosial**: `User`, `Follow`, `DirectMessage`, `Notification`
2. **Konten & Interaksi**: `Post`, `Comment`, `Like`, `Bookmark`
3. **Taksonomi & Panel Spesial**: `Category`, `Subcategory`, `Badge`, `UserBadge`, `CommunityEvent`
4. **Pencarian**: `SearchHistory`, `SearchTrend`
5. **Moderasi & Pemulihan**: `Report`, `PostWarning`, `ModerationLog`, `Appeal`

**Prinsip Pembaruan Database**:
- Perubahan skema menggunakan migrasi *non-destructive* (`prisma db push` yang menjaga kolom/tabel eksisting) dan `prisma/seed.js` berbasis `upsert` agar akun pengguna serta karya yang telah terbit tidak pernah terhapus saat pembaruan aplikasi.

---

## 5. Strategi Performa & Keamanan

- **Performa**:
  - `React.cache` pada `getCurrentUser()` untuk mencegah kueri user berulang dalam satu siklus render SSR.
  - `unstable_cache` (60 detik + invalidasi on-demand `revalidateTaxonomy()`) untuk kategori, subkategori, event aktif, dan badge.
  - Paginasi SQL langsung (`count` + `skip/take`) di halaman Eksplorasi serta pengurangan ukuran bundle awal lewat `next/dynamic` pada modal & komentar di `PostCard` serta `optimizePackageImports: ["lucide-react"]`.
- **Keamanan**:
  - Password di-hash menggunakan `bcryptjs`; sesi memakai cookie `HttpOnly` bertanda tangan JWT (`HS256`).
  - Pembatasan ketat *Role-Based Access Control* (`USER`, `MODERATOR`, `ADMIN`) pada setiap API route handler.
  - Validasi tipe/ukuran file unggahan (maks. 5 MB), sanitasi URL eksternal (blokir `javascript:`/`data:`), serta peringatan sebelum pengguna keluar ke domain eksternal.

---

## 6. Rencana Pengembangan Lanjutan (Backlog Opsional)

1. **Penyimpanan Objek Cloud (S3 / Cloudflare R2)**: Memindahkan penyimpanan `public/uploads/` ke *object storage* agar skalabel untuk deployment multi-server.
2. **Notifikasi Real-Time**: Menambahkan WebSocket / Server-Sent Events untuk pembaruan DM dan notifikasi tanpa polling interval.
3. **Pencarian Full-Text Terindeks**: Mengoptimalkan pencarian teks panjang dengan *full-text index* MySQL apabila volume konten melebihi puluhan ribu entri.
4. **Otomatisasi CI/CD & Pengujian Terjadwal**: Menjalankan build verification dan integrasi uji API secara otomatis pada setiap *pull request* GitHub.
