# Clockify Telegram Bot

Telegram bot untuk tracking waktu di Clockify. Mulai/stop timer, lihat status, dan rekap harian lewat chat.

## Fitur

- `/task <nama>` — Mulai task baru (auto-stop task sebelumnya)
- `/stop` — Stop task aktif
- `/status` — Lihat task yang sedang berjalan
- `/report` — Rekap aktivitas hari ini
- **Shortcut**: `/deploy`, `/meeting`, `/debug`, `/review`

## Tech Stack

- **Google Apps Script** — backend (tanpa server)
- **Clockify API** — time tracking
- **Telegram Bot API** — webhook-based
- **Google Sheets** — storage task log

## Setup

### 1. Buat Telegram Bot
- Chat [@BotFather](https://t.me/BotFather) → `/newbot` → copy token

### 2. Dapatkan Clockify Credentials
- Login [Clockify](https://app.clockify.me)
- **Profile → Integrations → API** → copy API Key
- Buka `https://api.clockify.me/api/v1/user` → copy `id` dan `defaultWorkspace`

### 3. Buat Google Spreadsheet
- Buat spreadsheet baru → copy ID dari URL

### 4. Deploy
```bash
npm install
clasp login
clasp push --force
```
Buka GAS Editor → **Deploy → New deployment → Web app → Anyone → Deploy**

### 5. Set Script Properties
Di GAS Editor → **Project Settings → Script Properties**:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `CLOCKIFY_API_KEY` | Clockify API Key |
| `CLOCKIFY_WORKSPACE_ID` | Workspace ID |
| `CLOCKIFY_USER_ID` | User ID |
| `SPREADSHEET_ID` | Spreadsheet ID |

### 6. Set Webhook
Jalankan `setWebhook()` dari GAS Editor ( fungsi di `Handlers.gs` ).

## File Structure

```
├── Code.gs          # Entry point (doGet/doPost)
├── Config.gs        # Script Properties reader
├── Telegram.gs      # Telegram API + webhook router
├── Clockify.gs      # Clockify REST API client
├── Sheets.gs        # Google Sheets CRUD
├── Handlers.gs      # Command handlers + formatters
├── Utils.gs         # Date/duration helpers
└── appsscript.json  # GAS manifest
```

## License

MIT
