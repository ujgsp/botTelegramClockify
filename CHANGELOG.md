## [Unreleased]

## [v1.1.0] - 2026-11-19

### Fitur Baru
- `/rekap [yyyy-mm]` — Rekap kerja bulanan: target jam, aktual, kelebihan/kekurangan, dedikasi 20 jam, dan kelayakan cuti berbayar (>20 jam).
- `/overtime [tgl] [tgl]` — Rincian jam kelebihan target harian dengan rentang waktu.
- `/ramadan tgl tgl` / `/ramadan clear` — Set periode Ramadan manual (target 6,5 jam/hari kerja).
- Dukungan hari kerja efektif: Senin–Jumat, libur (`/libur`), piket (`/piket`) tetap dihitung.

### Perbaikan Bug
- `/report` lambat: ganti pagination serial dengan filter `start`/`end` langsung ke API Clockify (1 request vs 3+).
- `/report` gagal pada data besar: batasi panjang pesan, escape HTML deskripsi, log respons Telegram.

### Maintenance
- Tambah utilitas `escapeHtml_()` dan `calculateOvertimeByDate_()`.
- Self-check otomatis perhitungan lembur dan filter tanggal Clockify.

## [v1.0.2] - 2026-06-09

### Fitur Baru
- Tambah loading indicator (⏳ Mohon ditunggu...) untuk `/status`, `/report`, `/last`, `/projects`.
- Pesan loading otomatis diedit menjadi hasil setelah data siap.

### Perbaikan Bug
- Fix `/stop` error 400: kirim `projectId` saat stop timer Clockify.
- Fix `/task` saat ganti task: kirim `projectId` saat stop timer sebelumnya.

### Maintenance
- Tambah method `Telegram.sendLoading()` dan `Telegram.editMessage()`.


## [v1.0.1] - 2026-05-23

### Security

- Tambahkan guard/middleware whitelist Telegram user ID di GAS.
- Hard-enforce whitelist di entrypoint webhook dan router pesan.
- `/diag` menampilkan status whitelist untuk verifikasi.

## [v1.0.0] - 2026-05-23

### Added

- `/task <nama>` — Mulai task baru, auto-stop timer aktif.
- `/stop` — Stop timer aktif.
- `/status` — Lihat task yang sedang berjalan.
- `/report` — Rekap waktu hari ini / tanggal tertentu / rentang tanggal.
- `/last` — Lihat entry Clockify terakhir.
- `/projects` — List project aktif.
- `/project <nama/id>` — Set default project.
- `/project new <nama>` — Buat project baru & set default.
- `/project clear` — Hapus default project.
- `/reminder on|off|status` — Reminder kerja otomatis.
- `/workhours HH:MM HH:MM` — Set jam kerja.
- `/target <jam>` — Set target jam kerja per hari.
- `/piket yyyy-mm-dd` — Tambah hari piket.
- `/libur yyyy-mm-dd` — Tambah hari libur.
- `/diag` — Diagnostic aman (tanpa secret).
- Shortcut: `/deploy`, `/meeting`, `/debug`, `/review`.

### Architecture

- Telegram webhook via Cloudflare Worker proxy.
- GAS doGet bridge untuk mengatasi 302/405 error.
- Clockify API sebagai satu-satunya source of truth.
- GitHub Actions release workflow otomatis.

### Documentation

- README dengan setup guide lengkap.
- CONTRIBUTING.md untuk kontributor.
- PANDUAN_RILIS.md — panduan cara rilis.
