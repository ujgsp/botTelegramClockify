# Clockify Telegram Bot

Telegram bot untuk tracking waktu di Clockify. Bot berjalan di **Google Apps Script (GAS)**, menerima update Telegram lewat **Cloudflare Worker proxy**, dan memakai **Clockify API sebagai satu-satunya source of truth**.

## Fitur

- `/task <nama>` — Mulai task baru dan auto-stop timer aktif sebelumnya
- `/stop` — Stop task aktif
- `/status` — Lihat task yang sedang berjalan
- `/report` atau `/today` — Rekap hari ini
- `/report yyyy-mm-dd` — Rekap tanggal tertentu
- `/report yyyy-mm-dd yyyy-mm-dd` — Rekap rentang tanggal
- `/last` — Lihat entry Clockify terakhir
- `/projects` — List project aktif Clockify
- `/project <nama/id>` — Set default project untuk task berikutnya
- `/project new <nama>` — Buat project Clockify dan jadikan default
- `/project clear` — Hapus default project
- `/reminder on|off|status` — Reminder kerja otomatis
- `/workhours 08:00 17:00` — Set jam kerja
- `/target 8` — Set target jam kerja per hari
- `/piket yyyy-mm-dd` — Tambah hari piket meski weekend/libur
- `/libur yyyy-mm-dd` — Tambah hari libur agar reminder mati
- `/diag` — Diagnostic aman (tanpa menampilkan secret)
- **Shortcut**: `/deploy`, `/meeting`, `/debug`, `/review`

## Arsitektur

```text
Telegram → Cloudflare Worker → GAS doGet bridge → Command Handler
                                      ↓
                                  Clockify API
```

Kenapa pakai Worker?

- Telegram webhook ke `script.google.com/macros/s/.../exec` sering gagal karena `302 Moved Temporarily`.
- POST ke URL redirect `script.googleusercontent.com` gagal dengan `405 Method Not Allowed`.
- Worker mengembalikan `200 OK` langsung ke Telegram agar tidak retry/duplikat, lalu forward update ke GAS via GET bridge: `?update=<json>`.

## Tech Stack

- **Google Apps Script** — backend serverless
- **Cloudflare Worker** — stable Telegram webhook proxy
- **Clockify REST API** — time tracking source of truth
- **Telegram Bot API** — bot webhook
- **clasp** — upload source ke GAS editor

## File Structure

```text
├── Code.gs               # doGet/doPost + dedup + Worker GET bridge
├── Config.gs             # Script Properties reader
├── Telegram.gs           # Telegram sendMessage + command router
├── Clockify.gs           # Clockify REST API client
├── Handlers.gs           # Command handlers
├── Reminder.gs           # Reminder config + time trigger
├── Utils.gs              # Date/duration helpers
├── appsscript.json       # GAS manifest
├── cloudflare-worker.js  # Telegram webhook proxy
├── .claspignore          # Exclude non-GAS files from clasp push
└── README.md
```

## Setup

### 1. Buat Telegram Bot

- Chat [@BotFather](https://t.me/BotFather) → `/newbot`
- Copy bot token

### 2. Dapatkan Clockify Credentials

- Login [Clockify](https://app.clockify.me)
- Profile → Integrations → API → copy API Key
- Ambil user/workspace via API:

```bash
curl -H "X-Api-Key: <CLOCKIFY_API_KEY>" https://api.clockify.me/api/v1/user
```

Gunakan:

- `id` → `CLOCKIFY_USER_ID`
- `defaultWorkspace` → `CLOCKIFY_WORKSPACE_ID`

### 3. Set Script Properties di GAS

GAS Editor → Project Settings → Script Properties:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `CLOCKIFY_API_KEY` | Clockify API Key |
| `CLOCKIFY_WORKSPACE_ID` | Workspace ID |
| `CLOCKIFY_USER_ID` | User ID |
| `CLOCKIFY_DEFAULT_PROJECT_ID` | Optional, bisa diset via `/project` |
| `REMINDER_ENABLED` | Optional, bisa diset via `/reminder on/off` |
| `WORK_START` / `WORK_END` | Optional, default `08:00` / `17:00` |
| `WORK_TARGET_HOURS` | Optional, default `8` |
| `PIKET_DATES` / `LIBUR_DATES` | Optional, comma-separated dates |

### 4. Push ke Google Apps Script

```bash
npm install
clasp login
clasp push --force
```

Lalu di GAS Editor:

1. Deploy → Manage deployments
2. Edit deployment existing atau New deployment pertama kali
3. Type: **Web app**
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Deploy dan authorize jika diminta

### 5. Deploy Cloudflare Worker

Deploy isi file `cloudflare-worker.js` ke Cloudflare Worker.

Worker variable:

| Key | Value |
|-----|-------|
| `env_gas` atau `GAS_WEBAPP_URL` | URL deploy GAS `/exec` |

### 6. Set Telegram Webhook ke Worker

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&drop_pending_updates=true"
```

## Clockify API Notes

Endpoint yang sudah diverifikasi untuk workspace ini:

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Start timer | `POST` | `/workspaces/{id}/time-entries` | Body: `description`, `start`, `billable`, optional `projectId` |
| Stop timer | `PUT` | `/workspaces/{id}/time-entries/{entryId}` | Bukan PATCH. Body wajib: `start`, `end`, `description` |
| Current timer | `GET` | `/workspaces/{id}/user/{uid}/time-entries?page-size=1` | Ambil latest, cek `timeInterval.end === null` |
| Report | `GET` | `/workspaces/{id}/user/{uid}/time-entries?page-size=100` | Filter tanggal di timezone `Asia/Jakarta` |

## Data Strategy

- **Clockify = source of truth** untuk semua timer, status, dan report.
- Tidak memakai Google Sheets lagi.
- GAS hanya menjalankan command dan reminder.

## Troubleshooting

### Bot diam / tidak merespon

1. Cek webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
2. Jika error `302 Moved Temporarily`: webhook masih mengarah langsung ke GAS. Set ke Worker.
3. Jika error `405 Method Not Allowed`: webhook mengarah ke `script.googleusercontent.com`. Set ke Worker.
4. Jika Worker `500`: cek variable Worker `env_gas` / `GAS_WEBAPP_URL`.
5. Cek GAS Editor → Executions untuk error handler.

### Duplikat response

- Telegram retry karena webhook lambat/gagal.
- Worker mengembalikan `200 OK` segera.
- GAS juga dedup by `update_id` via `CacheService`.

## Development Workflow

1. Edit `.gs` / Worker file lokal
2. Push GAS:
   ```bash
   clasp push --force
   ```
3. GAS Editor → Deploy new version
4. Jika Worker berubah, deploy Worker
5. Pastikan webhook tetap ke Worker
6. Test Telegram:
   ```text
   /start
   /task test
   /status
   /stop
   /report
   ```

## Security

- Jangan commit secret/token/API key.
- `.clasp.json`, `appsscript.json`, `.env*`, `.pi/` di-ignore.
- Secrets hanya di GAS Script Properties dan Cloudflare Worker Variables.

## License

MIT
