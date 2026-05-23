# Contributing to Clockify Telegram Bot

Terima kasih sudah berminat berkontribusi! 🎉

## Quick Start untuk Contributors

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/clockify-telegram-bot.git
cd clockify-telegram-bot

# 2. Install dependencies
npm install

# 3. Login clasp (butuh Google account)
npx clasp login

# 4. Push ke GAS pribadi Anda
npx clasp push --force

# 5. Deploy di GAS Editor & test
```

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [Google account](https://accounts.google.com/) untuk GAS
- [Cloudflare account](https://dash.cloudflare.com/) untuk Worker
- [Telegram account](https://telegram.org/) untuk testing
- [Clockify account](https://clockify.me/) free tier cukup

### Environment

Semua secrets disimpan di:

| Location | Secrets |
|----------|---------|
| GAS Script Properties | `TELEGRAM_BOT_TOKEN`, `CLOCKIFY_API_KEY`, `CLOCKIFY_WORKSPACE_ID`, `CLOCKIFY_USER_ID` |
| Cloudflare Worker Variables | `GAS_WEBAPP_URL` |

**Jangan pernah** commit secrets ke repository!

### File Structure

```text
├── Code.gs               # Entry point: doGet/doPost + dedup
├── Config.gs             # Script Properties reader
├── Telegram.gs           # Telegram sendMessage + command router
├── Clockify.gs           # Clockify REST API client
├── Handlers.gs           # Command handlers (task, stop, report, dll)
├── Reminder.gs           # Reminder config + time-driven trigger
├── Utils.gs              # Date/duration helpers
├── cloudflare-worker.js  # Telegram webhook proxy
├── .claspignore          # Exclude non-GAS files dari clasp push
└── README.md
```

## Cara Berkontribusi

### Bug Reports

Buka issue dengan:

1. **Judul**: `[Bug] Deskripsi singkat`
2. **Steps to reproduce**: Langkah-langkah untuk memunculkan bug
3. **Expected behavior**: Yang seharusnya terjadi
4. **Actual behavior**: Yang terjadi
5. **Environment**: GAS version, Cloudflare Worker, Clockify API

### Feature Requests

Buka issue dengan:

1. **Judul**: `[Feature] Deskripsi singkat`
2. **Use case**: Kenapa fitur ini dibutuhkan
3. **Proposed solution**: Bagaimana cara kerjanya (jika ada ide)

### Code Contributions

1. **Fork** repo ini
2. **Buat branch** dari `main`:
   ```bash
   git checkout -b fitur-baru
   ```
3. **Commit** dengan pesan yang jelas:
   ```bash
   git commit -m 'Tambah: fitur export CSV'
   ```
4. **Push** ke fork Anda:
   ```bash
   git push origin fitur-baru
   ```
5. **Buka Pull Request** ke `main`

### Commit Message Convention

Gunakan format:

```text
<type>: <deskripsi>

Types:
-Tambah: fitur baru
- Fix: perbaikan bug
- Update: perubahan kecil
- Refactor: refactor kode
- Docs: dokumentasi
- Test: penambahan test
```

Contoh:

```text
Tambah: command /export untuk export CSV
Fix: timer tidak stop saat /task baru
Update: tingkatkan error handling di Clockify.gs
Docs: tambah troubleshooting di README
```

## Development Workflow

### Testing Locally

1. Edit file `.gs` atau `cloudflare-worker.js`
2. Push ke GAS:
   ```bash
   npx clasp push --force
   ```
3. GAS Editor → Deploy → New version
4. Jika Worker berubah, deploy Worker
5. Test via Telegram:
   ```text
   /start
   /diag
   /task test
   /status
   /stop
   /report
   ```

### Testing Worker

```bash
# GET health check
curl https://YOUR_WORKER_URL/

# Expected:
# {"status":"ok","service":"clockify-telegram-proxy","version":"1.1"}

# POST test
curl -X POST https://YOUR_WORKER_URL/ -d '{"test":true}'

# Expected:
# ok
```

### Testing Clockify API

```bash
# Test API key
curl -H "X-Api-Key: YOUR_API_KEY" https://api.clockify.me/api/v1/user

# Get active timer
curl -H "X-Api-Key: YOUR_API_KEY" \
  "https://api.clockify.me/api/v1/workspaces/WORKSPACE_ID/user/USER_ID/time-entries?page-size=1"
```

## Code Style

### Google Apps Script (.gs)

- Gunakan `var` bukan `let/const` (GAS V8 support, tapi konsisten dengan codebase)
- Fungsi harus snake_case atau camelCase (ikuti yang sudah ada)
- Selalu handle error dengan `try/catch`
- Return JSON response yang konsisten

### Cloudflare Worker

- Gunakan `export default` syntax
- Handle semua HTTP methods (GET, POST, dll)
- Return response yang konsisten

## Security Checklist

Sebelum buka PR:

```bash
# Cek tidak ada secret yang bocor
grep -r "TELEGRAM_BOT_TOKEN\|CLOCKIFY_API_KEY\|X-Api-Key" *.gs *.js

# Harus kosong!
```

## Questions?

Buka issue dengan tag `[Question]` atau diskusi di Discussion tab.
