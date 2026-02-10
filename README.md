# 🔍 Snoo-Clues

A daily subreddit guessing game built for Reddit using Devvit and GameMaker.

[![Devvit](https://img.shields.io/badge/Devvit-0.12.x-FF4500?style=flat-square&logo=reddit)](https://developers.reddit.com/)
[![GameMaker](https://img.shields.io/badge/GameMaker-WASM-00D632?style=flat-square)](https://gamemaker.io/)
[![License](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg?style=flat-square)](LICENSE)

## 🎮 About

Snoo-Clues is a daily puzzle game where Sleuths guess a Subreddit based on three pieces of progressive evidence. Built as a **hybrid Devvit + GameMaker application**, it combines the power of a game engine with the seamless integration of Reddit's Devvit platform.

### How to Play

> **Note:** Daily Case Files reset at midnight UTC. Your streak is based on UTC dates.

1. **Read Evidence #1** - Always visible on your Sleuth notebook.
2. **Reveal Evidence #2 and #3** - Click "Show Evidence" cards as needed to uncover more hints.
3. **Guess the Subreddit** - Enter your answer (case-insensitive).
4. **Win!** - Once solved, your Case File is stamped "CLOSED".
5. **Report Findings** - Post your results to the Reddit thread to show off your sleuthing skills.

## ✨ Features

- 🎯 **Daily Case Files** - A new hand-picked Subreddit to guess every day.
- 🏛️ **The Archives** - Unlimited practice mode with over 50 different Subreddits.
- 🔥 **Daily Streaks** - Track your consecutive daily wins. Don't let the flame go out!
- 🏆 **Global Leaderboard** - See how you rank against other Sleuths in the community.
- ⚖️ **Sleuth Ranks** - Earn titles based on your total points (Daily Case = 10 pts, Archives = 1 pt):
  - **Rookie Sleuth** (0–9 points)
  - **Junior Sleuth** (10–49 points)
  - **Senior Sleuth** (50–99 points)
  - **Lead Sleuth** (100–199 points)
  - **Chief of Sleuths** (200+ points)
- 🎨 **Premium UI** - A "Sleuth Notebook" aesthetic with typewriter effects and glassmorphism.
- 🏗️ **Hybrid Engine** - Uses GameMaker for background animations and mascot reactions, layered with a responsive HTML/TS interface.

## 🚀 Getting Started

### Prerequisites

- **Node.js 22+** (Recommended)
- [Devvit CLI](https://developers.reddit.com/docs/get-started)
- Reddit Developer account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/asifdotpy/snoo-clues.git
   cd snoo-clues
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

### Development & Testing

**Run local playtest:**
```bash
npm run dev
```
This will start the development server and provide a playtest URL for your test subreddit.

**Run tests:**
```bash
npx vitest run
```
Executes the suite of unit tests for the client-side logic.

### Deployment

```bash
# Upload to Reddit
npm run deploy

# Publish to production (requires review)
npm run launch
```

## 📁 Project Structure

```
snoo-clues/
├── src/
│   ├── client/          # Frontend (HTML/TS + GameMaker Bridge)
│   ├── server/          # Backend (Devvit + Express + Redis)
│   └── shared/          # Shared types and constants
├── dist/                # Build output
├── docs/                # Documentation and screenshots
└── devvit.json          # Devvit configuration
```

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the Reddit Hackathon by [@asifdotpy](https://github.com/asifdotpy)
