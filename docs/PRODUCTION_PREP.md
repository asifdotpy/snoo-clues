# Production Preparation Guide for Snoo Clues

To ensure Snoo Clues looks professional in the Reddit App Directory and during the loading state, follow these steps to replace the placeholder assets.

## 1. AI Asset Generation Prompts

Use these prompts with an AI image generator (like Midjourney, DALL-E 3, or Stable Diffusion) to create high-quality assets that match the game's theme.

### App Logo (`assets/logo.png`)
> **Prompt:** A professional, minimalist square logo for a Reddit game called 'Snoo Clues'. The icon features a stylized Reddit Snoo head wearing a classic detective fedora and holding a magnifying glass. Colors: Reddit Orange (#ff4500) and Dark Gray (#333) on a clean Off-White (#fdf5e6) background. High resolution, flat vector style, centered, no text.

*   **Requirements:** 1024x1024 pixels, PNG format.

### Splash Background (`assets/splash-bg.png`)
> **Prompt:** A wide, cinematic background for a detective-themed game loading screen. A dark, moody desk with a scattering of files, a magnifying glass, and a classic noir lamp casting an orange glow. The overall theme uses dark grays (#333) and deep oranges (#ff4500). High detail, atmospheric, 16:9 aspect ratio, suitable for a splash screen background.

*   **Requirements:** At least 1920x1080 pixels, PNG format.

---

## 2. Production Checklist

Before running `devvit upload` for production:

1.  [ ] **Replace Placeholders:** Overwrite `assets/logo.png` and `assets/splash-bg.png` with your generated assets.
2.  [ ] **Verify `devvit.json`:** Ensure `marketingAssets.icon` points to the new logo.
3.  [ ] **Check `createPost` Logic:** Confirm `src/server/core/post.ts` has the correct `appDisplayName` and `description`.
4.  [ ] **Build Project:** Run `npm run build` to ensure all server-side changes are compiled into `dist/`.
5.  [ ] **Test Locally:** Use `devvit playtest` to verify the splash screen appears correctly in your test subreddit.
6.  [ ] **Clean Up:** Remove any console logs or debug flags used during development.

---

## 3. Theme Reference
*   **Primary Orange:** `#ff4500`
*   **Dark Gray:** `#333333`
*   **Off-White (Paper):** `#fdf5e6`
