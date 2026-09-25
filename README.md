# MemoryMatch

MemoryMatch is a responsive memory card matching game built with plain HTML, CSS, and JavaScript. Match every pair, unlock the next level, and work through a 100-level difficulty ladder from Beginner to Champion.

## Features

- 100 sequentially unlocked levels
- Level 1 is available immediately; each completed level unlocks the next
- Difficulty ranks:
  - Beginner: levels 1-5
  - Easy: levels 6-12
  - Medium: levels 13-20
  - Hard: levels 21-28
  - Difficult: levels 29-36
  - Advanced: levels 37-44
  - Expert: levels 45-52
  - Candidate Master: levels 53-60
  - Master: levels 61-68
  - Leader: levels 69-76
  - Grand Master: levels 77-84
  - Heroic: levels 85-99
  - Champion: level 100
- Progressive card-pair difficulty
- Timer, move counter, and per-level best score showing the fewest moves
- Restart, pause/resume, hint, and level selection controls
- Dark mode with saved preference
- Sound effects for flips, matches, mistakes, level changes, and wins
- Musical background loop that changes with each level
- Responsive layout for phones, tablets, laptops, and touch screens
- Accessible buttons, labels, focus states, and keyboard controls
- Progress and best scores saved in browser `localStorage`

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Game interface and modal markup |
| `style.css` | Responsive layout, animations, light mode, and dark mode |
| `script.js` | Game state, cards, levels, audio, persistence, and controls |
| `favicon.svg` | Memory-game browser icon |
| `index.js` | Optional dependency-free local web server |

## Run In A Browser

Open `index.html` directly in a browser. No package installation is required.

## Run With The Local Server

Node.js 18 or newer is recommended.

```bash
node index.js
```

Then open <http://localhost:3000>.

To use another port:

```bash
PORT=8080 node index.js
```

On PowerShell:

```powershell
$env:PORT = 8080
node index.js
```

## Controls

- Click a card to reveal it.
- Match two cards with the same symbol.
- Press `H` for a hint.
- Press `Space` to pause or resume.
- Use Restart to reset the current level.
- Use the level selector to choose an unlocked level.
- Use the theme and sound buttons in the top-right corner.

## Browser Support

The game uses standard browser APIs and works in current versions of Chrome, Edge, Firefox, and Safari on desktop and mobile devices. Sound starts after the Play button because browsers block autoplay before user interaction.

## Development Notes

The game has no framework or external runtime dependency. Level progress, theme preference, sound preference, and best moves are stored locally in the browser. Clearing browser storage resets progress.

## License

This project is provided for personal and educational use.