# Expense & Budget Visualizer

> A beautiful, dark-themed expense tracker built with pure HTML, CSS, and Vanilla JavaScript — no frameworks, no backend, no build tools.

![Screenshot](screenshot.png)

---

## ✨ Features

### MVP
- **Add transactions** — item name, amount, category with real-time validation and shake animations
- **Transaction list** — scrollable, animated slide-in/slide-out, custom scrollbar
- **Total balance** — count-up animation, color-coded (green = healthy, red = over budget)
- **Doughnut chart** — powered by Chart.js, animated updates, custom legend

### Optional Challenges (all 3 included)
- **Custom categories** — add new categories on the fly, auto-assigned a color from the palette, persisted in localStorage
- **Sort transactions** — sort by Date, Amount (↑/↓), or Category with FLIP-style re-order animations
- **Dark / Light mode toggle** — sun↔moon icon morph, smooth CSS custom property transitions, preference saved in localStorage

### UX Polish
- Toast notifications on add/delete actions
- Floating empty state illustration
- Ripple effect on the primary button
- Glassmorphism card design with subtle glow accents
- Fully responsive (mobile-first, stacks at < 768px)
- Respects `prefers-reduced-motion`
- Keyboard accessible, ARIA-labelled icon buttons

---

## 🚀 Getting Started

No install needed — just open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

```bash
# Or serve locally with any static server, e.g.:
npx serve .
```

---

## 📁 Project Structure

```
project-root/
├── .kiro/            ← Required by CodingCamp (keep in repo)
├── css/
│   └── style.css     ← All styles (1 file only)
├── js/
│   └── app.js        ← All logic (1 file only)
├── index.html
└── README.md
```

---

## 💾 Data Model

All data lives in the browser's `localStorage` — no server, no login.

| Key | Type | Description |
|---|---|---|
| `ebv_transactions` | `Array<{id, name, amount, category, createdAt}>` | All recorded transactions |
| `ebv_categories` | `string[]` | Default + custom categories |
| `ebv_theme` | `"dark" \| "light"` | User's theme preference |

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styles | Vanilla CSS (custom properties, glassmorphism, animations) |
| Logic | Vanilla JavaScript (ES6+, no frameworks) |
| Chart | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Fonts | Space Grotesk + JetBrains Mono (Google Fonts) |
| Storage | Browser `localStorage` API |

---

## 🎯 Acceptance Criteria

- [x] All 4 MVP features work and update in real-time without reload
- [x] Data persists after browser refresh
- [x] 3 optional challenges implemented (Custom Categories, Sort, Dark/Light Mode)
- [x] Only 1 CSS file and 1 JS file
- [x] `.kiro/` folder exists at project root
- [x] Responsive at 375px mobile viewport
- [x] Dark/light mode consistent across all components including chart
- [x] README with usage instructions

---

## 📝 License

MIT — free to use and modify.
