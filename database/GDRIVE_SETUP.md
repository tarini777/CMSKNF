# Google Drive Dataset Storage

Large CMS Open Payments CSV files (~18 GB, 33.5M rows) live in **Google Drive**. This repository keeps **metadata only** in [`manifest.json`](./manifest.json).

## What stays in git

| In repo | Not in repo |
|---------|-------------|
| `database/manifest.json` | `database/PGYR*/**/*.csv` |
| Architecture docs | `database/PHPRFL*/**/*.csv` |
| Import mapping & file sizes | Raw publication extracts |

## Option A — Google Drive desktop sync (recommended)

No service account required. Files sync via the Google Drive for Desktop app.

### 1. Copy datasets to synced Drive folder

```bash
cd cms-compliance-nextjs
./scripts/copy-datasets-to-gdrive-sync.sh
```

Default destination:

`/Users/tarini/Google Drive/My Drive/CMSKNF/cms-open-payments/`

### 2. Manifest already points at desktop sync

[`manifest.json`](./manifest.json) sets:

```json
"storage": {
  "mode": "desktop_sync",
  "desktopSyncRoot": "/Users/tarini/Google Drive/My Drive/CMSKNF/cms-open-payments"
}
```

Override per machine with:

```bash
CMS_DATASET_DESKTOP_SYNC_ROOT="/path/to/your/sync/folder"
```

### 3. Import at runtime (reads from synced folder)

```bash
CMS_DATASET_STORAGE=local npm run db:import-puf -- --resume --batch-size 300
```

### 4. After sync completes, delete local repo copies (optional)

```bash
rm -rf database/PGYR2023_P01232026_01102026
rm -rf "database/PGYR2024_P01232026_01102026 (1)"
rm -rf database/PHPRFL_P01232026_01102026
```

---

## Option B — Google Drive API (service account)

### 1. Create a Drive folder

Create a folder (or Shared Drive folder) and upload the nine CSV files from the CMS publication zips. Keep original filenames.

### 2. Service account

1. Create a GCP service account with Drive API enabled.
2. Download JSON key → store outside git (e.g. `~/.config/cmsknf/gdrive-sa.json`).
3. Share the Drive folder with the service account email (`...@....iam.gserviceaccount.com`) as **Viewer** (import) or **Content manager** (upload script).

### 3. Environment

Add to `cms-compliance-nextjs/.env.local`:

```bash
CMS_DATASET_STORAGE=gdrive
GDRIVE_DATASET_FOLDER_ID=your-folder-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
CMS_DATASET_MANIFEST_PATH=../database/manifest.json
```

### 4. Link manifest to Drive files

If files are already in Drive (uploaded manually):

```bash
cd cms-compliance-nextjs
npm run datasets:sync-gdrive
```

This matches filenames in the folder and writes `gdriveFileId` into `database/manifest.json`.

**Or** upload from local copies (one-time migration):

```bash
npm run datasets:upload-gdrive
```

### 5. Import at runtime (streams from Drive)

```bash
CMS_DATASET_STORAGE=gdrive npm run db:import-puf -- --resume --batch-size 300
```

No local CSV copies required after upload.

## API

```bash
curl -s http://localhost:3000/api/datasets?action=manifest | jq .
curl -s http://localhost:3000/api/datasets?action=sources | jq .
```

## Storage modes

| `CMS_DATASET_STORAGE` | Behavior |
|-----------------------|----------|
| `auto` (default) | Use Drive when `gdriveFileId` is set; else local fallback |
| `gdrive` | Always stream from Drive |
| `local` | Read from `database/` paths in manifest |

## After migration

Delete local CSV folders to reclaim disk:

```bash
rm -rf database/PGYR2023_P01232026_01102026
rm -rf "database/PGYR2024_P01232026_01102026 (1)"
rm -rf database/PHPRFL_P01232026_01102026
```

Metadata in `manifest.json` remains the source of truth.
