# 👾 CODE QUIZ: 1984 Retro Arcade Edition 🕹️

> A 1980s retro arcade-themed web game testing your mastery of database internals, SQL syntax, and programming concepts. Designed with pixel art aesthetics, neon glow, CRT scanlines, combo streak scoring, and a persistent Hall of Fame leaderboard.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen?style=for-the-badge)
![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-Ready-blue?style=for-the-badge&logo=github)

---

## 🎮 Features

- **Classic 8-Bit Arcade Aesthetics**:
  - Glowing neon cyan, hot pink, Pac-Man yellow, and coin gold color palette.
  - Authentic CRT screen scanlines overlay with a live `📺 CRT: ON/OFF` toggle button.
  - Pixel typography using Google Fonts (`Press Start 2P` for arcade marquees, paired with `Space Mono` for crisp readability of complex definitions).
  - Tactile 3D button press animations and pulsing combo multipliers.
- **Built-in Deck: 216 PostgreSQL Questions**:
  - Covers 15 functional categories including Data Query Language (DQL), Data Manipulation (DML), Data Definition (DDL), Window Functions, MVCC Concurrency & Lock Modes (`FOR UPDATE`, `FOR NO KEY UPDATE`), Constraints, and more.
  - Every question features 4 comprehensive, technical definitions with subtle, challenging distractors.
- **Custom Deck Loader ("Insert Disk")**:
  - Drag-and-drop or browse any custom `.json` quiz file directly from your machine.
  - Automatic category extraction and validation without modifying any code.
- **2 Distinct Gameplay Modes**:
  - **📖 Standard Mode (Study & Practice)**: Perfect for learning. After submitting an answer (whether correct or wrong), the quiz pauses indefinitely so you can thoroughly review the comprehensive definition and inspect the realistic PostgreSQL SQL query example. You manually advance when ready by clicking `CONTINUE >>` or pressing <kbd>Enter</kbd> / <kbd>Space</kbd>.
  - **⚡ Speedrun Mode (Arcade Rush)**: Tailored for high-speed runs and arcade reflexes. Questions automatically advance immediately after answering so you can race the clock and max out your speed bonus!
- **Dynamic Round Lengths**:
  - **Quick Run**: 10 questions
  - **Standard**: 25 questions
  - **Marathon**: 50 questions
  - **Survival**: All available questions in the category
- **Arcade Scoring & Timer**:
  - Live millisecond stopwatch (`MM:SS.s`).
  - Base points: `1,000 PTS` per correct answer.
  - Speed bonus: Up to `+1,000 PTS` for lightning-fast responses within 12 seconds.
  - Combo streaks: Consecutive correct answers trigger escalating score multipliers (`x1.2`, `x1.5`, `x1.8`, `x2.0 COMBO! 🔥`).
- **Hall of Fame Leaderboard**:
  - Automatically records your top scores, accuracy, elapsed time, and deck info to browser `localStorage`.
  - Distinguishes scores earned in `[📖 STD]` vs `[⚡ RUN]` modes.
  - Enter your arcade pilot handle (3–12 characters) to claim a spot on the leaderboard.
- **Mobile-First & Zero Dependencies**:
  - Fully responsive from 360px portrait smartphones to 4K ultra-wide monitors.
  - Pure vanilla HTML, CSS, and JavaScript — no build steps, bundlers, or external packages required.

---

## 🕹️ Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Select Answer** | Click on option card OR press <kbd>A</kbd>, <kbd>B</kbd>, <kbd>C</kbd>, <kbd>D</kbd> |
| **Advance Question** | Click `NEXT >>` / `CONTINUE >>` OR press <kbd>Enter</kbd> / <kbd>Space</kbd> |
| **Toggle Scanlines** | Click `📺 CRT: ON/OFF` in the top header |
| **Return to Menu** | Click `🏠 MENU` |
| **View Leaderboard** | Click `🏆 SCORES` |

---

## 🚀 Quick Start & Local Preview

Because the project is built with vanilla web standards, you can run it locally with any simple HTTP server:

### Option 1: Python (Recommended)
```bash
python3 -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### Option 2: Node.js (npx)
```bash
npx serve .
```

---

## 🌐 Deploying to GitHub Pages

This repository is pre-configured for instant zero-configuration deployment to GitHub Pages (includes `.nojekyll` and relative URL assets):

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: initial release of Code Quiz 1984"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git push -u origin main
   ```
2. On your GitHub repository page:
   - Go to **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Under **Branch**, select **`main`** (or `master`) and folder **`/ (root)`**.
   - Click **Save**.
3. In ~1 minute, your arcade quiz will be live at:
   ```
   https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/
   ```

---

## 📁 Project Structure

```
code_quiz/
├── index.html            # Main single-page application markup & modals
├── .nojekyll             # Tells GitHub Pages to bypass Jekyll processing
├── .gitignore            # Clean git configuration
├── README.md             # Documentation
├── css/
│   └── style.css         # Retro arcade styles, neon glows, CRT effects & responsive layouts
├── js/
│   ├── app.js            # SPA controller, event routing, keyboard shortcuts
│   ├── deckLoader.js     # Default fetcher + custom JSON drag-and-drop parser
│   ├── quizEngine.js     # Fisher-Yates shuffle, timer, scoring & combo multipliers
│   └── highscores.js     # LocalStorage persistence & leaderboard renderer
└── questions/
    └── postgresql.json   # 216 PostgreSQL questions with technical options & answers
```

---

## 💾 Creating Custom Question Disks

You can load your own question decks into the game using the **"💾 INSERT DISK"** button. Your JSON file should follow this structure:

```json
[
  {
    "category": "Data Query Language (DQL)",
    "title": "FOR UPDATE",
    "options": {
      "a": "Acquires a Share lock on selected rows that allows concurrent reads but defers all incoming writes until commit.",
      "b": "An immediate DML directive that updates column values in place without generating WAL records.",
      "c": "Acquires Exclusive row-level locks on selected rows, blocking concurrent transactions from updating, deleting, or locking the same rows.",
      "d": "Acquires a weaker lock than FOR NO KEY UPDATE that permits concurrent transactions to acquire share locks."
    },
    "answer": "c"
  }
]
```

---

## 📜 License

Released under the [MIT License](LICENSE). Built for developers and retro gaming enthusiasts!
