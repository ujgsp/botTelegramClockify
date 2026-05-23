# Panduan Rilis — Clockify Telegram Bot

Panduan lengkap untuk melakukan rilis versi baru.

---

## Flow Rilis

```text
1. Update CHANGELOG.md
2. Commit perubahan
3. Buat tag (contoh: v1.1.0)
4. Push tag ke GitHub
5. GitHub Actions otomatis publish release
```

---

## Step-by-Step

### 1. Update CHANGELOG.md

Buka `CHANGELOG.md` dan isi perubahan di section `[Unreleased]`:

```markdown
## [Unreleased]

### Fitur Baru
- Deskripsi fitur baru.

### Perbaikan Bug
- Deskripsi bug yang diperbaiki.

### Maintenance
- Update dependency, refactor, dll.
```

**Format penulisan:**

| Bagian | Isi | Contoh |
|--------|-----|--------|
| `### Fitur Baru` | Functionality baru | `- /export — Export laporan ke CSV` |
| `### Perbaikan Bug` | Bug yang diperbaiki | `- Timer tidak stop saat /task baru` |
| `### Maintenance` | Refactor, dependency, CI/CD | `- Update Node.js ke v22` |
| `### Dokumentasi` | Perubahan docs | `- Tambah troubleshooting guide` |

**Tips:**
- Gunakan `-` (dash) sebagai bullet.
- Tulis dalam Bahasa Indonesia.
- Tulis dalam bentuk imperative ("Tambah" bukan "Ditambahkan").
- Referensi issue/PR: [#123](https://github.com/...) (opsional).

### 2. Commit Perubahan

```bash
git status
git add CHANGELOG.md
git add <file lain yang berubah>
git commit -m "Deskripsi perubahan"
```

**Commit message convention:**

```
Tambah: deskripsi fitur baru
Fix: deskripsi bug fix
Update: deskripsi perubahan kecil
Refactor: deskripsi refactor
Docs: deskripsi dokumentasi
```

Contoh:
```bash
git commit -m "Tambah: fitur /export CSV"
git commit -m "Fix: timer tidak stop saat ganti project"
git commit -m "Update: upgrade clasp ke v2.5"
```

### 3. Buat Tag

```bash
# Format: vMAJOR.MINOR.PATCH
git tag v1.1.0
```

**Kapan bump version?**

| Tipe | Kapan | Contoh |
|------|-------|--------|
| `PATCH` | Bug fix, perubahan kecil | v1.0.0 → v1.0.1 |
| `MINOR` | Fitur baru, backward compatible | v1.0.0 → v1.1.0 |
| `MAJOR` | Breaking changes | v1.0.0 → v2.0.0 |

**Contoh tag:**
- `v1.0.1` — Bug fix pertama
- `v1.1.0` — Fitur baru pertama
- `v2.0.0` — Breaking changes pertama

### 4. Push Tag

```bash
git push origin v1.1.0
```

### 5. Cek Release

Buka `https://github.com/ujgsp/botTelegramClockify/releases` untuk melihat release yang dibuat otomatis.

---

## Apa yang Terjadi Otomatis

GitHub Actions akan:

1. ✅ Checkout source code
2. ✅ Install dependencies
3. ✅ Package source code jadi ZIP (`clockify-telegram-bot-v1.1.0.zip`)
4. ✅ Publish GitHub Release dengan:
   - Release notes dari `CHANGELOG.md`
   - Auto-generated notes dari commits/PRs
   - Artifact ZIP untuk download

---

## Manual Release

Bisa juga di-trigger manual dari GitHub:

1. Buka tab **Actions** → **Release**
2. Klik **Run workflow**
3. Isi tag (contoh: `v1.1.0`)
4. Klik **Run workflow**

---

## Troubleshooting

### Release tidak terbuat

1. Cek tab **Actions** → pastikan workflow running
2. Pastikan tag format benar: `v*.*.*` (contoh: `v1.0.0`)
3. Cek error log di GitHub Actions

### Artifact tidak ada

1. Pastikan `CHANGELOG.md` ada di repo
2. Cek workflow log untuk error

### Release notes kosong

1. Pastikan ada perubahan di `CHANGELOG.md` di bawah section yang benar
2. Pastikan format heading benar: `## [v1.1.0] - YYYY-MM-DD`

---

## Contoh Lengkap Rilis

```bash
# 1. Kerja fitur baru
git add Handlers.gs Clockify.gs
git commit -m "Tambah: fitur /export CSV"

# 2. Update CHANGELOG
vim CHANGELOG.md
# Tambah di [Unreleased] → ### Fitur Baru
git add CHANGELOG.md
git commit -m "Update CHANGELOG untuk v1.1.0"

# 3. Tag & push
git tag v1.1.0
git push origin v1.1.0

# 4. Selesai! Release otomatis terbit.
```
