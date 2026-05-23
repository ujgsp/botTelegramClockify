## [Unreleased]

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
