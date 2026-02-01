# 🔍 Snoo-Clues

A daily subreddit guessing game built for Reddit using Devvit and GameMaker.

[![Devvit](https://img.shields.io/badge/Devvit-0.12.x-FF4500?style=flat-square&logo=reddit)](https://developers.reddit.com/)
[![GameMaker](https://img.shields.io/badge/GameMaker-WASM-00D632?style=flat-square)](https://gamemaker.io/)
[![License](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg?style=flat-square)](LICENSE)

## 🎮 About

Snoo-Clues is a daily puzzle game where players guess a subreddit based on three progressive clues. Built as a **hybrid Devvit + GameMaker application** for the Reddit Hackathon while maintaining GameMaker Prize eligibility.

### How to Play

1. **Read Clue #1** - Always visible
2. **Reveal Clues #2 and #3** - Click "Show Clue" buttons as needed
3. **Guess the Subreddit** - Enter your answer (lowercase auto-applied)
4. **Win!** - Share your result to Reddit

## ✨ Features

- 🎯 **Daily Puzzles** - New subreddit to guess each day
- 🔐 **Redis State Tracking** - Remembers if you've played today
- 📊 **Attempt Counter** - Tracks how many guesses you make
- 🎉 **Share to Reddit** - Post your victory as a comment
- 📱 **Fully Responsive** - Works on mobile and desktop
- 🎨 **Premium UI** - Reddit-themed glassmorphism design
- 🏆 **GameMaker Compatible** - Maintains prize eligibility

## 🏗️ Architecture

### Hybrid Design

The app uses a **dual-layer architecture**:
- **GameMaker Engine** (Background) - Canvas-based WASM runtime
- **Game Overlay** (Foreground) - HTML/CSS/JS puzzle interface

Both systems coexist without conflict, preserving GameMaker eligibility while providing custom game mechanics.

### Tech Stack

- **Backend**: Devvit (Express.js + Redis)
- **Frontend**: TypeScript + Vanilla JS
- **Styling**: CSS3 with Glassmorphism
- **Build**: Vite 6.2.4
- **Game Engine**: GameMaker WASM

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
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

4. **Run local playtest**
   ```bash
   npm run dev
   ```

   Opens: `https://www.reddit.com/r/snoo_clues_dev/?playtest=snoo-clues`

### Deployment

```bash
# Build and upload to Reddit
npm run deploy

# Publish to production
npm run launch
```

## 📁 Project Structure

```
snoo-clues/
├── src/
│   ├── client/          # Frontend (GameMaker + Overlay)
│   │   ├── main.ts      # GameLoader + SnooCluesGame
│   │   ├── index.html   # Canvas + Overlay UI
│   │   ├── style.css    # Game styling
│   │   └── public/      # GameMaker runtime files
│   ├── server/          # Backend (Devvit)
│   │   └── index.ts     # Puzzles + Redis + Endpoints
│   └── shared/
│       └── types/       # TypeScript types
├── dist/                # Build output (gitignored)
└── devvit.json          # Devvit configuration
```

## 🎯 API Endpoints

### `GET /api/game/init`
Returns today's clues and user status
```json
{
  "type": "game_init",
  "clues": ["Clue 1", "Clue 2", "Clue 3"],
  "hasPlayedToday": false,
  "attempts": 0,
  "isWinner": false
}
```

### `POST /api/game/guess`
Validates a guess against today's answer
```json
{
  "type": "guess_result",
  "correct": true,
  "answer": "aww",
  "attempts": 3
}
```

### `POST /api/game/share`
Posts celebration comment to Reddit thread

## 🧩 Daily Puzzles

Puzzles are defined in `src/server/index.ts`:

```typescript
const DAILY_PUZZLES = [
  {
    date: "2026-02-01",
    subreddit: "aww",
    clues: [
      "This subreddit is dedicated to things that make you go 'awww!'",
      "Cute animals, babies, and heartwarming moments",
      "🐶🐱👶 One of the most wholesome places on Reddit"
    ]
  },
  // ... more puzzles
];
```

## 🐛 Known Issues

- [#1 Build Warnings](https://github.com/asifdotpy/snoo-clues/issues/1) - Vite outDir and protobufjs eval warnings (low priority)

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add more daily puzzles
- Improve UI/UX
- Fix bugs
- Add features

## 🏆 Hackathon Info

Built for the Reddit Hackathon with dual goals:
1. Create an engaging daily puzzle game for Reddit users
2. Maintain GameMaker Prize eligibility through hybrid architecture

## 📞 Support

- Create an [issue](https://github.com/asifdotpy/snoo-clues/issues) for bugs
- Check the [Devvit documentation](https://developers.reddit.com/docs)
- Review the [GameMaker template guide](docs/HowToBuild.md)

---

Made with ❤️ for Reddit by [@asifdotpy](https://github.com/asifdotpy)