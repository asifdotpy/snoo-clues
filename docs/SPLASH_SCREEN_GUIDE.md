# Splash Screen Guide — Reddit Developer Platform

This doc explains **what the Splash Screen is**, how Snoo-Clues configures it, and how to plan changes.

---

## What is the Splash Screen?

When someone sees your app in the feed (before opening it), Reddit shows a **preview card** — the **Splash Screen**. By default it shows "SN" initials and a grey background. You customize it so users see your app name, logo, background, and copy (e.g. "Can you solve it?" and "Play Now").

- **Where:** The marked/red circle area in the Reddit Developer Platform docs = this preview card.
- **When it’s used:** Only for **Devvit Web** (webview) apps. Snoo-Clues is one (post loads `index.html` from `dist/client`).
- **When it’s set:** When the app **creates the post** via `reddit.submitCustomPost()`. The `splash` object in that call defines the card.

---

## How Snoo-Clues Is Already Set Up

### 1. Code — `src/server/core/post.ts`

Post creation already passes a `splash` object:

| Property         | Current value                          | Purpose                          |
|------------------|----------------------------------------|----------------------------------|
| `appDisplayName` | `"Snoo-Clues"`                         | App name                         |
| `appIconUri`     | `"logo_premium.png"`                   | Logo (replaces "SN")             |
| `backgroundUri`  | `"splash_bg_premium.png"`              | Background image                 |
| `buttonLabel`    | `"Play Now"`                           | Launch button text               |
| `description`    | `"Find the hidden clues..."`           | Sub-text                         |
| `heading`        | `"Can you solve it?"`                  | Main headline                    |

So: logo, background, and text are already configured.

### 2. Assets — `assets/`

| File                   | Use in splash      |
|------------------------|--------------------|
| `logo_premium.png`     | `appIconUri`       |
| `splash_bg_premium.png`| `backgroundUri`    |
| `logo.png`             | Marketing/other    |
| `splash-bg.png`        | Alternate         |

References in code are **filename only** (e.g. `'logo_premium.png'`), not paths.

**Same logo, two uses:** `assets/logo_premium.png` is used for (1) **marketing icon** in `devvit.json` (`marketingAssets.icon`) and (2) **splash logo** (`appIconUri` in `post.ts`). Getting this one file right satisfies both.

### 3. Config — `devvit.json`

```json
"media": { "dir": "assets" }
```

Reddit loads splash images from this `assets/` folder, so the setup is correct.

---

## Devvit CLI warnings — and how to fix them

When you run `npm run dev` or `devvit playtest`, the CLI may show warnings about the **icon** (the file in `devvit.json` → `marketingAssets.icon`, i.e. `assets/logo_premium.png`). Fix these for a proper submission.

| Warning | Meaning | What to do |
|--------|---------|------------|
| **Icon asset is not a PNG** | File is not a real PNG (e.g. JPEG renamed to .png, or wrong format). | Export/save the logo as a **true PNG** (e.g. from your editor “Export as PNG” or use ImageMagick/Photoshop/GIMP). Replace `assets/logo_premium.png`. |
| **Icon asset is smaller than 1024×1024 pixels** | Reddit recommends 1024×1024 for quality. | **Resize the logo to 1024×1024** (square). Use an image editor or: `convert logo_premium.png -resize 1024x1024 logo_premium_1024.png` (ImageMagick), then replace the file. |
| **Icon asset is 640×640. Consider using a standard size** | Current size is non-standard; 1024×1024 is preferred. | Same as above: **resize to 1024×1024** and overwrite `assets/logo_premium.png`. |

After fixing, run `npm run build` and `devvit playtest` again; the warnings should go away. The same `logo_premium.png` is used for the app icon and the splash screen, so one correct asset fixes both.

---

## Manual asset prep (before submission)

Do this once so your splash and app icon look professional and the CLI is clean.

### Logo (`assets/logo_premium.png`)

- [ ] **Format:** True **PNG** (not JPEG or other format with .png extension).
- [ ] **Dimensions:** **1024×1024** pixels (square). This is the size Reddit recommends; 640×640 or smaller will trigger warnings.
- [ ] **Content:** Centered, works at small size (it appears in the feed and on the splash card).
- **How:** Use your image editor to resize to 1024×1024 and export as PNG, then overwrite `assets/logo_premium.png`.

### Background (`assets/splash_bg_premium.png`)

- [ ] **Format:** PNG (or as required by Reddit).
- [ ] **Dimensions:** No strict minimum in the guide; for a full-bleed look, use at least **1024×1024** or a wide aspect (e.g. 1920×1080) if the splash is wide. For a solid color, a small PNG (e.g. 1×1) is enough.
- [ ] **Content:** Looks good behind the logo and text on the preview card.
- **Optional:** Resize or re-export if it looks blurry or stretched in playtest.

### Verify

- [ ] Run `npm run build`, then `devvit playtest`. Check the terminal for icon/splash warnings.
- [ ] Create a **new** post and confirm the splash screen and app icon look correct in the feed.

---

## Planning Checklist

Use this when changing the splash or debugging.

### If you change images

1. **Replace files** in `assets/` (e.g. new `logo_premium.png`, `splash_bg_premium.png`).
2. **Logo:** Use **1024×1024 PNG** so the CLI doesn’t warn and quality is good (see “Manual asset prep” above).
3. **Background:** Can be a small solid-color PNG (e.g. 1×1) for a flat color, or a larger image for a custom look.
4. **Names:** Keep the same filenames in `post.ts` / `devvit.json` or update both code and assets.

### If you change text or structure

1. **Edit** `src/server/core/post.ts` → `splash` object:
   - `appDisplayName` — app name
   - `heading` — main headline (if supported)
   - `description` — sub-text
   - `buttonLabel` — button text
2. **Rebuild:** `npm run build` so `dist/server` includes the change.
3. **Redeploy/playtest** (see below).

### Playtest / seeing changes

- Splash is fixed **when the post is created**. Existing posts may keep the old splash.
- To see updates:
  1. Run `devvit playtest` (or your usual playtest command).
  2. **Create a new post** (e.g. via “Create a new post” menu).
  3. Check the new post’s preview card in the feed.
- If the card doesn’t update, create another new post; don’t rely on editing an old one.

### Before hackathon / production

- [ ] **Assets:** Logo is **1024×1024 PNG**; background is sized and formatted as needed (see “Manual asset prep” above).
- [ ] **CLI clean:** Run `devvit playtest` and fix any “Icon asset…” warnings before submitting.
- [ ] Splash copy matches your pitch (`appDisplayName`, `description`, `heading`).
- [ ] Logo and background look good at small size (feed preview).
- [ ] `npm run build` and create a **new** playtest post to confirm.

---

## Quick reference

| Goal                     | Where to change it                          |
|--------------------------|---------------------------------------------|
| Logo (splash + app icon) | Replace `assets/logo_premium.png` — use **1024×1024 PNG** to avoid CLI warnings |
| Background               | Replace `assets/splash_bg_premium.png` or change `backgroundUri` in `post.ts` |
| App name                 | `post.ts` → `appDisplayName`                |
| Main headline            | `post.ts` → `heading`                      |
| Sub-text                 | `post.ts` → `description`                   |
| Button text              | `post.ts` → `buttonLabel`                   |
| App icon (store/listing)  | `devvit.json` → `marketingAssets.icon` (same file as splash logo) |
| Where Reddit finds media | `devvit.json` → `media.dir` = `"assets"`    |

**Summary:** Splash is configured in `createPost()`, assets live in `assets/`, and `devvit.json` points to that folder. Resize the logo to **1024×1024** and ensure it’s a **real PNG** so the CLI is clean and the product is submission-ready.
