# Clockify Telegram Bot

Telegram bot untuk tracking waktu di Clockify. Bot berjalan di **Google Apps Script (GAS)**, menerima update Telegram lewat **Cloudflare Worker proxy**, memakai **Clockify API** sebagai source of truth, dan menyimpan log tambahan ke **Google Sheets**.

## Fitur

- `/task <nama>` — Mulai task baru dan auto-stop timer aktif sebelumnya
- `/stop` — Stop task aktif
- `/status` — Lihat task yang sedang berjalan
- `/report` atau `/today` — Rekap aktivitas hari ini
- `/last` — Lihat entry Clockify terakhir
- `/projects` — List project aktif Clockify
- `/project <nama/id>` — Set default project untuk task berikutnya
- `/project new <nama>` — Buat project Clockify dan jadikan default
- `/project clear` — Hapus default project
- `/diag` — Diagnostic aman (tanpa menampilkan secret)
- **Shortcut**: `/deploy`, `/meeting`, `/debug`, `/review`

## Arsitektur

```text
Telegram → Cloudflare Worker → GAS doGet bridge → Command Handler
                                      ↓
                              Clockify API + Google Sheets
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
- **Google Sheets** — local task log/cache
- **clasp** — upload source ke GAS editor

## File Structure

```text
├── Code.gs               # doGet/doPost + dedup + Worker GET bridge
├── Config.gs             # Script Properties reader
├── Telegram.gs           # Telegram sendMessage + command router
├── Clockify.gs           # Clockify REST API client
├── Sheets.gs             # Google Sheets CRUD
├── Handlers.gs           # /task, /stop, /status, /report, /help
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

### 3. Buat Google Spreadsheet

- Buat spreadsheet baru
- Copy ID dari URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### 4. Set Script Properties di GAS

GAS Editor → Project Settings → Script Properties:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `CLOCKIFY_API_KEY` | Clockify API Key |
| `CLOCKIFY_WORKSPACE_ID` | Workspace ID |
| `CLOCKIFY_USER_ID` | User ID |
| `SPREADSHEET_ID` | Spreadsheet ID |
| `CLOCKIFY_DEFAULT_PROJECT_ID` | Optional, bisa diset via `/project` |

### 5. Push ke Google Apps Script

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

### 6. Deploy Cloudflare Worker

Deploy isi file `cloudflare-worker.js` ke Cloudflare Worker.

Worker variable:

| Key | Value |
|-----|-------|
| `env_gas` atau `GAS_WEBAPP_URL` | URL deploy GAS `/exec` |

Contoh:

```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

### 7. Set Telegram Webhook ke Worker

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&drop_pending_updates=true"
```

Cek:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Expected:

```text
pending_update_count: 0
last_error_message: null
url: <WORKER_URL>
```

## Clockify API Notes

Endpoint yang sudah diverifikasi untuk workspace ini:

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Start timer | `POST` | `/workspaces/{id}/time-entries` | Body: `description`, `start`, `billable` |
| Stop timer | `PUT` | `/workspaces/{id}/time-entries/{entryId}` | Bukan PATCH. Body wajib: `start`, `end`, `description` |
| Current timer | `GET` | `/workspaces/{id}/user/{uid}/time-entries?page-size=1` | Ambil latest, cek `timeInterval.end === null` |
| Report today | `GET` | `/workspaces/{id}/user/{uid}/time-entries?page-size=50` | Filter tanggal di timezone `Asia/Jakarta` |

## Data Strategy

- **Clockify = source of truth** untuk timer aktif dan report fallback.
- **Google Sheets = local log/cache** untuk rekap lokal.
- Jika Sheets out-of-sync, `/stop`, `/status`, dan `/report` fallback ke Clockify.

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

### `/task` jalan tapi `/stop` bilang tidak ada task aktif

- Biasanya Sheets out-of-sync.
- Code terbaru fallback ke Clockify; pastikan sudah `clasp push --force` dan deploy new version di GAS.

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
