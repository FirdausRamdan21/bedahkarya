# Dokumen Workflow & Alur Sistem — BedahKarya

Dokumen ini memetakan alur kerja (*workflow*) utama dari sisi pengguna, moderasi, hingga sinkronisasi cache dan database di **BedahKarya**.

---

## 1. Alur Autentikasi & Kontrol Akses (RBAC)

```mermaid
flowchart TD
    A["Pengguna Mengakses Rute"] --> B{"Ada Cookie Sesi JWT?"}
    B -- "Tidak" --> C["Mode Guest (Read-Only Publik)"]
    C --> D{"Akses /upload, /settings, /messages, /admin?"}
    D -- "Ya" --> E["Redirect ke /login"]
    D -- "Tidak" --> F["Tampilkan Konten Publik"]

    B -- "Ya" --> G["Verifikasi JWT & Ambil User (React.cache)"]
    G --> H{"Apakah isSuspended = true?"}
    H -- "Ya" --> I{"Cek suspendedUntil"}
    I -- "Sudah Lewat" --> J["Auto-Bebaskan Akun (isSuspended = false)"]
    I -- "Masih Berlaku / Permanen" --> K["Mode Baca + Banner Peringatan + Akses /appeal"]
    K -- "Coba POST/PATCH/DELETE Write" --> L["Ditolak HTTP 403"]

    H -- "Tidak" --> M{"Cek Role Akun"}
    M -- "USER" --> N["Akses Penuh Fitur Kreator"]
    M -- "MODERATOR" --> O["Akses Fitur Kreator + /admin (kecuali ubah role & hapus user)"]
    M -- "ADMIN" --> P["Akses Penuh Seluruh Sistem"]
```

---

## 2. Alur Unggah, Validasi Media, & Publikasi Konten

```mermaid
sequenceDiagram
    actor U as Kreator
    participant UI as UploadForm (/upload)
    participant API as POST /api/posts
    participant DB as MySQL (Prisma)
    participant FS as public/uploads/

    U->>UI: Isi judul, kategori, subkategori, event, deskripsi
    UI->>UI: Cek anti-tautan pada judul (containsLink)
    alt Mode Gambar
        U->>UI: Pilih file gambar & atur crop/zoom/format (4:5 atau 16:9)
        UI->>UI: Render hasil framing ke HTML5 Canvas -> Blob
    else Mode Hanya Teks
        UI->>UI: Siapkan pratinjau kartu #CBD5E1 (imageFormat = TEXT)
    end
    U->>UI: Klik "Simpan Draf" atau "Publikasikan"
    UI->>API: Kirim FormData
    API->>API: Validasi sesi aktif, judul, panjang caption, kategori & subkategori di DB
    opt Ada file gambar
        API->>FS: Simpan file gambar tervalidasi (maks. 5 MB)
    end
    API->>DB: Simpan record Post (+ tags, mentions, eventId)
    API-->>UI: 201 Created { post }
    UI-->>U: Redirect ke /post/[id] (atau /profile/[username]?tab=draft)
```

---

## 3. Alur Pencarian Pintar & Eksplorasi

```mermaid
flowchart LR
    Q["Input Search"] --> P{"Prefix Query?"}
    P -- "Kosong / Fokus" --> H["Tampilkan maks. 5 Riwayat + Tren Terkini"]
    P -- "Diawali @" --> M["GET /api/search/suggest?q=@... (Prioritas Following)"]
    P -- "Diawali #" --> T["GET /api/search/suggest?q=#... (5 Tag Terkini / Filter Substring)"]
    P -- "Teks Biasa" --> S["Submit ke /search?q=..."]
    S --> REC["Simpan ke SearchHistory & Increment SearchTrend"]
    S --> SQL["Query SQL Terpaginasi (Kategori, Subkategori, Event, Keyword)"]
```

---

## 4. Alur Pengawasan, Peringatan, & Uji Banding

```mermaid
flowchart TD
    R1["User Melaporkan Konten + Screenshot"] --> R2["Report Masuk (Status: PENDING)"]
    R2 --> R3["Moderator / Admin Meninjau di /admin/reports atau /admin/contents"]

    R3 --> W1["Kirim Peringatan 1/2"]
    W1 --> W2["Kirim Peringatan 2/2"]
    W2 --> V["Tetapkan Status PELANGGARAN"]

    R3 --> S1["Tangguhkan Akun (Jam/Hari/Bulan/Tahun atau Permanen)"]
    S1 --> N1["Notifikasi WARNING Terkirim ke User"]
    N1 --> A1["User Tertangguhkan Ajukan Uji Banding (/appeal) + 1–3 Foto Bukti"]
    A1 --> A2["Masuk Antrean /admin/appeals"]
    A2 --> A3{"Keputusan Staff"}
    A3 -- "Bebaskan" --> A4["Akun Dipulihkan (isSuspended = false) + Notifikasi Pemulihan"]
    A3 -- "Tolak" --> A5["Penangguhan Tetap Berlaku + Catatan Penolakan"]
```

---

## 5. Alur Panel Spesial & Sinkronisasi Cache (`taxonomy`)

```mermaid
flowchart LR
    Staff["Moderator / Admin di /admin/special"] --> Act{"Aksi Panel Spesial"}
    Act -- "Badge" --> B["Buat Badge / Sematkan ke User / Cabut Badge"]
    B --> NB["Kirim Notifikasi Pengumuman Admin ke User Penerima"]
    Act -- "Kategori / Subkategori" --> C["Tambah / Hapus Kategori & Subkategori di DB"]
    Act -- "Event Komunitas" --> E["Buat / Aktif-Nonaktifkan / Hapus Event + Broadcast Notifikasi"]
    B & C & E --> REV["Panggil revalidateTaxonomy() (Tag: 'taxonomy')"]
    REV --> LIVE["Beranda, Eksplorasi, Upload, & Profil Langsung Sinkron"]
```
