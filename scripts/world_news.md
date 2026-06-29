# World News Tab - Implementation Plan (COMPLETED)

## Overview
Create a new "World News" tab that works exactly like the existing "Macro Focus" (diem-tin-vi-mo) but uses the Supabase table `market_summary_macro_world`.

## Components to Create/Modify

### 1. New Script: `scripts/generate-world-news.mjs` ✅
- Copied `generate-digest-macro.mjs` as a base
- Modified Supabase table name from `market_summary_macro` to `market_summary_macro_world`
- Updated directory name from `diem-tin-vi-mo` to `world-news`
- Updated all references accordingly

### 2. Update `i18n.json` ✅
- Added "worldNews" translations for all languages

### 3. Update Tab Bar in All Existing Pages ✅
- Added "World News" tab to:
  - `generate-digest-macro.mjs` (hub and spoke pages)
  - `generate-digest.mjs` (hub and spoke pages)

### 4. Create Client-side Script (if needed) ✅
- Reusing `seo-client-macro.js` which already handles the necessary functionality

## Directory Structure
```
world-news/
├── index.html (redirects to vi/)
├── vi/
│   ├── index.html (hub)
│   └── [spoke-slug]/
│       └── index.html
├── en/
├── ko/
├── zh/
├── th/
├── ar/
└── ja/
```

## Steps Completed
✅ 1. Create `scripts/generate-world-news.mjs`
✅ 2. Update `i18n.json` with translations
✅ 3. Test the script
✅ 4. Run the script to generate the initial pages

## Usage
Run the script to generate/update World News pages:
```bash
# Use sample data (development/testing)
node scripts/generate-world-news.mjs --sample

# Fetch data from Supabase (production)
node scripts/generate-world-news.mjs
```
