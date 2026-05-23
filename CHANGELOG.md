# Catatan Rilis / CHANGELOG

Semua perubahan penting pada Clockify Telegram Bot dicatat di file ini.

Format versi mengikuti semver: `vMAJOR.MINOR.PATCH`.

## [v1.0.1] - 2026-05-23

### Fitur Baru
- Workflow GitHub Actions untuk release otomatis.
- Konfigurasi release notes berdasarkan label GitHub.
- Panduan Cloudflare Worker deployment lengkap di README.
- PANDUAN_RILIS.md — panduan lengkap cara rilis.

## [v1.0.0] - 2026-05-23

### Fitur Baru
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

### Arsitektur
- Telegram webhook via Cloudflare Worker proxy.
- GAS doGet bridge untuk mengatasi 302/405 error.
- Clockify API sebagai satu-satunya source of truth.
- Dedup update_id via CacheService.

### Dokumentasi
- README lengkap dengan setup guide.
- CONTRIBUTING.md untuk kontributor.
- Troubleshooting guide.
- Clockify API quirks documentation.
