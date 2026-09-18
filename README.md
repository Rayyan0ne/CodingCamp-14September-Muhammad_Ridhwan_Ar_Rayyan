<div align="center">

# ◈ KrayBudget

**A smart, client-side expense tracker built with pure HTML, CSS & Vanilla JavaScript.**  
No backend. No login. No frameworks. Just open and go.

[![HTML](https://img.shields.io/badge/HTML5-Semantic-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-Custom%20Properties-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?style=flat-square)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22FFA1?style=flat-square)](LICENSE)

</div>

---

## 🎯 What Is This?

**KrayBudget** is a personal budget tracker that saya built as part of the RevoU Front-End Engineering program. The goal was to build a fully functional, beautiful expense visualizer using **only** HTML, CSS, and Vanilla JavaScript — no React, no Vue, no build tools, nothing.

Every feature — from the animated splash screen to the real-time doughnut chart — runs entirely in the browser. All data is persisted via `localStorage`, so nothing is ever sent to a server.

---

## ✨ Features

### 🧾 Core Functionality
| Feature | Description |
|---|---|
| **Add Transactions** | Input item name, amount (Rp), and category with real-time form validation and shake animations on error |
| **Rp Number Formatting** | Amount input auto-formats with thousand separators as you type — e.g. `10000` becomes `Rp 10.000` live |
| **Transaction List** | Scrollable list with slide-in/out animations, sortable by your preference |
| **Total Spending** | Count-up animation display showing cumulative spending, color-coded (🟢 healthy / 🔴 over budget) |
| **Spending Chart** | Animated doughnut chart (Chart.js) with a custom legend; colors are permanently stored per category — no color-shift bugs |

### ⚙️ Advanced Features
| Feature | Description |
|---|---|
| **Budget Limit** | Set a spending cap in Rp with quick ±adjust buttons (±10k / ±50k / ±100k); a progress bar shows consumption |
| **Budget Warning Modal** | If a new transaction would push the total over your limit, a modal appears with a full cost breakdown — cancel or confirm to proceed anyway |
| **Custom Categories + Color Picker** | Create new spending categories with a custom color chosen via an inline color picker — color is saved permanently and shown in the chart |
| **Delete Custom Categories** | User-added categories can be deleted via a chip tag with a ✕ button; a modal asks what to do with existing transactions (keep or delete them) |
| **Sort Transactions** | Sort by Date, Amount (↑ or ↓), or Category with FLIP-style reorder animations |
| **Monthly Summary** | View spending per category filtered by month |
| **Dark / Light Mode** | Sun↔moon toggle with smooth CSS transitions, preference saved in `localStorage` |

### 🎬 UX & Animations
| Feature | Description |
|---|---|
| **Welcome Splash Screen** | Full-screen animated welcome with floating glowing orbs, particle effects, and a blur-reveal of the "KrayBudget" brand — plays on every page visit |
| **Click to Enter** | User must click anywhere on the splash to enter the dashboard (intentional — no auto-dismiss) |
| **Exit Button** | Solid red button in the header — triggers a confirmation modal before returning to the welcome screen |
| **Toast Notifications** | Slide-in toast messages on add/delete actions |
| **Ripple Effect** | Material-style ripple animation on the primary submit button |
| **Glassmorphism UI** | Frosted-glass cards with glow accents, backdrop blur, and subtle borders |

---

## 🚀 Getting Started

**No installation required.** Just open the file in any modern browser.

```bash
# Clone the repo
git clone https://github.com/your-username/kraybudget.git
cd kraybudget

# Option 1: Open directly
open index.html

# Option 2: Serve locally
npx serve .
```

> ✅ Tested on: Chrome, Firefox, Edge, Safari (latest versions)

---

## 📁 Project Structure

```
kraybudget/
├── .kiro/              ← Required by RevoU CodingCamp (keep in repo)
├── css/
│   └── style.css       ← All styles in a single file (~2000 lines)
├── js/
│   └── app.js          ← All application logic in a single file
├── index.html          ← Single-page app entry point
└── README.md
```

> **Constraint:** Only 1 CSS file and 1 JS file — by design.

---

## 🧠 How It Works

### Core Data Flow
```
User fills form → JS validates input
                         ↓
                  (validation fails?)
                  Yes → shake + show error
                  No  → budget limit check
                              ↓
                       (over limit?)
                       Yes → warning modal with breakdown
                               ↓            ↓
                            cancel       confirm anyway
                       No  →    ↓
                         addTransaction()
                              ↓
                    save to localStorage
                              ↓
             render: list + chart + balance + monthly
```

### Budget Warning System
When a budget limit is set and a new transaction would push spending **over** that limit, the submit is intercepted and a modal shows:

- 🎯 Budget limit set
- 💸 Amount already spent
- ➕ This new transaction
- ⚠️ **Total result** (displayed in red)

The user can **cancel** (transaction not added) or **proceed anyway** (transaction added despite over-limit).

### Splash Screen → Dashboard Flow
```
Page loads
    ↓
Splash animates: floating orbs → logo → "WELCOME TO" → "KrayBudget" blur-reveal → tagline → CTA
    ↓
"tap anywhere to enter" appears at ~2.6s
    ↓
User clicks anywhere on splash
    ↓
Splash slides up → Dashboard becomes visible
    ↓
User clicks red "Keluar" button in header
    ↓
Confirmation modal: "Yakin mau keluar?"
    ↓
User confirms → app fades out → splash replays from scratch
```

---

## 💾 Data Model

All data lives in `localStorage`. Nothing is ever sent to a server.

| Key | Type | Description |
|---|---|---|
| `ebv_transactions` | `Array<{id, name, amount, category, createdAt}>` | All recorded transactions |
| `ebv_categories` | `string[]` | Default + custom categories |
| `ebv_category_colors` | `{ [categoryName]: string }` | Hex color map per category — persisted so chart colors never shift |
| `ebv_theme` | `"dark" \| "light"` | User's saved theme preference |
| `ebv_budget_limit` | `number` | Spending cap in Rupiah (0 = no limit) |

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic elements, ARIA labels, roles) |
| Styles | Vanilla CSS (custom properties, glassmorphism, `@keyframes`, `clamp()`) |
| Logic | Vanilla JavaScript (ES6+, IIFE modules, no frameworks or build tools) |
| Chart | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Fonts | Space Grotesk + JetBrains Mono via Google Fonts |
| Storage | Browser `localStorage` API |

---

## 🖼️ Design System

- **Primary accent:** Cyan `#00F0FF` — used for focus states, brand, active elements
- **Secondary accent:** Purple `#A855F7` — gradients, chart slices
- **Success:** Emerald `#22FFA1` — healthy balance, positive states
- **Warning:** Amber `#FFB830` — budget limit warnings
- **Danger:** Red `#FF3D5A` — over-budget, delete, exit button
- **Dark mode first** with full light mode support via CSS custom properties
- **Responsive** — mobile-first layout that stacks cleanly at < 768px
- **Accessible** — keyboard navigable, ARIA-labelled interactive elements, `prefers-reduced-motion` aware

---

## ✅ Project Checklist

- [x] All 4 MVP features work and update in real-time without page reload
- [x] Data persists after browser refresh via `localStorage`
- [x] 3 optional challenges: Custom Categories, Sort, Dark/Light Mode
- [x] Only 1 CSS file and 1 JS file
- [x] `.kiro/` folder exists at project root
- [x] Responsive at 375px mobile viewport
- [x] Dark/light mode consistent across all components including the chart
- [x] Budget limit with warning modal and quick ±adjust buttons
- [x] Animated splash screen with click-to-enter
- [x] Exit flow with confirmation modal
- [x] Rp thousand-separator formatting on all money inputs (live, as-you-type)
- [x] Custom category color picker — color stored permanently, no index-based shifting
- [x] Delete custom category with modal — choose to keep or delete associated transactions
- [x] Chart hover color bug fixed — `hoverBackgroundColor` now always stays in sync

---

## 📝 License

MIT — free to use, fork, and modify.

---

<div align="center">

Built with 🔥 by **Rayyan** — RevoU Front-End Engineering 2026

</div>
