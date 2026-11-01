# claudeomnitest

Tic Tac Toe — a small, dependency-free web game.

**Play online:** https://suaidishak.github.io/claudeomnitest/

## Play

Open `index.html` in any modern browser (double-click it, or drag it into a tab).

Prefer a local server?

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

Or serve it with Node:

```bash
npx serve .
```

## Features

- Two players on one device, or one player against a computer powered by
  minimax — it can be drawn, never beaten.
- Scoreboard tracked per mode, persisted in `localStorage`.
- Keyboard friendly: arrow keys move between cells, Enter/Space places a mark.
- Responsive layout, follows light/dark preference, respects reduced-motion.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Styling and animations |
| `game.js` | Game state, rendering, and the minimax opponent |
