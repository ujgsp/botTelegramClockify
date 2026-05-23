# Clockify Telegram Bot

Telegram bot untuk tracking waktu di Clockify. Bot berjalan di **Google Apps Script (GAS)**, menerima update Telegram lewat **Cloudflare Worker proxy**, dan memakai **Clockify API sebagai satu-satunya source of truth**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Built with:** Google Apps Script · Cloudflare Workers · Clockify API · Telegram Bot API

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

---

## Quick Start (Ringkas)

Bagi yang sudah familiar dengan GAS + Cloudflare Workers:

```bash
# 1. Clone & install
git clone https://github.com/YOUR_USERNAME/clockify-telegram-bot.git
cd clockify-telegram-bot
npm install

# 2. Login clasp
npx clasp login

# 3. Push ke GAS
npx clasp push --force

# 4. Deploy di GAS Editor → Web App → Execute as Me → Anyone

# 5. Deploy Cloudflare Worker dengan env_gas = URL GAS /exec

# 6. Set webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&drop_pending_updates=true"

# 7. Test
# Kirim /start ke bot Telegram Anda
```

---

## Setup Lengkap

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
| `TELEGRAM_ALLOWED_USER_IDS` | Optional, whitelist user Telegram. Pisahkan dengan koma/spasi. Jika diisi, hanya user yang terdaftar yang diproses |
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

Cloudflare Worker berfungsi sebagai **stable proxy** untuk Telegram webhook. Kenapa tidak langsung ke GAS?

| Masalah | Penjelasan |
|---------|------------|
| `302 Moved Temporarily` | GAS web app sering redirect |
| `405 Method Not Allowed` | Telegram tidak bisa POST ke redirect target |
| `200 OK` response | Worker langsung reply agar Telegram tidak retry/duplikat |

#### 5a. Buat Cloudflare Account

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Sign up (gratis, tidak perlu card)
3. Verify email

#### 5b. Buat Worker

1. Login Cloudflare Dashboard
2. Pilih **Workers & Pages** (sidebar kiri)
3. Klik **Create Application**
4. Pilih **Create Worker**
5. Beri nama (contoh: `clockify-telegram-proxy`)
6. Klik **Deploy**

#### 5c. Deploy Code

1. Setelah Worker created, klik **Edit code**
2. Hapus semua code bawaan
3. Copy paste isi `cloudflare-worker.js` dari repo ini
4. Klik **Deploy** (saves and deploys)

#### 5d. Set Environment Variable

1. Kembali ke Worker dashboard
2. Pilih tab **Settings** → **Variables**
3. Klik **Add variable**
4. Isi:

| Field | Value |
|-------|-------|
| Variable name | `GAS_WEBAPP_URL` |
| Value | `https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_ID/exec` |
| Type | Encrypt (recommended) |

5. Klik **Save**

#### 5e. Ambil Worker URL

Setelah deploy, Worker punya URL seperti:

```text
https://clockify-telegram-proxy.YOUR_SUBDOMAIN.workers.dev
```

Copy URL ini — akan dipakai di step 6.

#### 5f. Test Worker

```bash
# GET health check
curl https://clockify-telegram-proxy.YOUR_SUBDOMAIN.workers.dev/

# Expected response:
# {"status":"ok","service":"clockify-telegram-proxy","version":"1.1"}

# POST test
curl -X POST https://clockify-telegram-proxy.YOUR_SUBDOMAIN.workers.dev/ -d '{"test":true}'

# Expected response:
# ok
```

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

---

## Usage — Bot Commands

### Basic Time Tracking

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/start` atau `/help` | Tampilkan daftar command | `/start` |
| `/task <nama>` | Stop timer aktif, mulai task baru | `/task coding fix bug` |
| `/stop` | Stop timer yang sedang berjalan | `/stop` |
| `/status` | Lihat task apa yang sedang jalan | `/status` |
| `/last` | Lihat entry Clockify terakhir | `/last` |

### Reports

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/report` atau `/today` | Rekap waktu hari ini | `/report` |
| `/report yyyy-mm-dd` | Rekap tanggal tertentu | `/report 2026-05-20` |
| `/report yyyy-mm-dd yyyy-mm-dd` | Rekap rentang tanggal | `/report 2026-05-01 2026-05-23` |

### Project Management

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/projects` | List semua project aktif di Clockify | `/projects` |
| `/project <nama/id>` | Set default project untuk task berikutnya | `/project MyProject` |
| `/project new <nama>` | Buat project baru di Clockify & set sebagai default | `/project new ClientX` |
| `/project clear` | Hapus default project | `/project clear` |

### Reminder & Work Hours

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/reminder on` | Aktifkan reminder kerja otomatis | `/reminder on` |
| `/reminder off` | Matikan reminder | `/reminder off` |
| `/reminder status` | Cek status reminder | `/reminder status` |
| `/workhours HH:MM HH:MM` | Set jam kerja untuk reminder | `/workhours 08:00 17:00` |
| `/target <jam>` | Set target jam kerja per hari | `/target 8` |

### Special Dates

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `/piket yyyy-mm-dd` | Tambah hari piket (reminder tetap aktif di weekend/libur) | `/piket 2026-05-25` |
| `/piket clear yyyy-mm-dd` | Hapus hari piket | `/piket clear 2026-05-25` |
| `/libur yyyy-mm-dd` | Tambah hari libur (reminder mati) | `/libur 2026-05-26` |
| `/libur clear yyyy-mm-dd` | Hapus hari libur | `/libur clear 2026-05-26` |

### Shortcuts

| Command | Task Name |
|---------|-----------|
| `/deploy` | `deploy` |
| `/meeting` | `meeting` |
| `/debug` | `debug` |
| `/review` | `review` |

### Diagnostic

| Command | Deskripsi |
|---------|-----------|
| `/diag` | Cek status bot (aman, tidak menampilkan secret) |

---

## Tips & Tricks

### Workflow Harian

```text
1. Mulai kerja: /task coding fitur baru
2. Pindah task: /task review PR   ← otomatis stop timer lama
3. Selesai: /stop
4. Cek rekap: /report
```

### Project Default

Set default project supaya tidak perlu ketik ID setiap kali:

```text
/project MyClient
/task desain UI   ← otomatis pakai project MyClient
```

### Reminder Setup

```text
/workhours 09:00 17:00
/target 8
/reminder on
```

Bot akan mengingatkan Anda untuk mulai dan istirahat sesuai jam kerja.

### Weekend / Hari Libur

```text
/libur 2026-05-26   ← reminder mati di tanggal ini
/piket 2026-05-25   ← reminder tetap aktif meski hari Minggu
```

### Multi-User?

Bot ini dirancang untuk **single user** (Anda sendiri). Setiap user ID Clockify berbeda, jadi bot hanya cocok dipakai sendiri atau di-fork untuk user lain dengan credential masing-masing.

Jika ingin membatasi akses Telegram, isi `TELEGRAM_ALLOWED_USER_IDS` di Script Properties. Contoh:

```text
315354966,123456789
```

Kalau property ini kosong, bot tetap menerima semua user (fail-open).

---

## Security

- Jangan commit secret/token/API key.
- `.clasp.json`, `appsscript.json`, `.env*`, `.pi/` di-ignore.
- Secrets hanya di GAS Script Properties dan Cloudflare Worker Variables.
- Tambahkan `TELEGRAM_ALLOWED_USER_IDS` untuk whitelist jika bot dipakai lebih dari satu akun Telegram.


---

## Contributing

1. Fork repo ini
2. Buat branch baru: `git checkout -b fitur-baru`
3. Commit: `git commit -m 'Tambah fitur baru'`
4. Push: `git push origin fitur-baru`
5. Buat Pull Request

Pastikan tidak ada secret/token yang ter-commit.

---

## License

MIT
