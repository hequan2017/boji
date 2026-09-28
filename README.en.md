[简体中文](README.md) | [English](README.en.md)

<div align="center">

# 💪 BOJI Fitness Club

**A 16-week "lean muscle" training guide tailored for skinny beginners — pure frontend · zero dependencies · open source**

[![License: MIT](https://img.shields.io/badge/License-MIT-c2f542.svg)](LICENSE)
[![Pure Frontend](https://img.shields.io/badge/pure_frontend-zero_dependency-5ec8f8.svg)](#)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-ffb454.svg)](#-deploy-to-github-pages)

**Looks slim in clothes, fit without them** · Defaults are tailored to a `183cm / 68kg` skinny build — every parameter is customizable

</div>

## Introduction

BOJI is a muscle-gain starter site for skinny newcomers: no sign-up, no app install — open it in a browser and you get a complete 16-week training program. All training/diet content and check-in data live in your own browser, with no backend and no network requests.

## ✨ Features

| Module | Description |
| --- | --- |
| 🏠 **Overview** | Body profile (height/weight/BMI/goal), four-phase roadmap, core principles, skinny-guy FAQ |
| 📅 **Training Plan** | 16 weeks · 3 sessions per week · 4 exercises per session for the first 4 weeks, up to 5 afterwards; repeats and drills fundamental movement patterns — no complex splits or advanced techniques |
| 🏋️ **Exercise Library** | A pinned "Big 3 Basics" section (push-up / squat / sit-up): Bilibili video tutorials embedded by default, switchable to dependency-free inline SVG loop animations; below it, the 13 plan-required exercises, each with its own demo image, key points, common mistakes, and alternatives, filterable by body part |
| 🍚 **Diet** | Target intake calculated with the Mifflin-St Jeor formula, covering weight trends, calorie adjustments, protein, and pre/post-workout meals; hand-portion method, one-week meal rotation, ingredient swap table, eating-out survival guide (canteen/delivery/dinners), diet-myth FAQ, meal examples scaled to your target calories, plus supplement pitfalls |
| 📈 **Tracking** | 16-week workout check-ins, completion stats, gap to target weight, data export/import (JSON) |

### Technical Highlights

- Pure static `HTML + CSS + vanilla JavaScript` — **no frameworks, no build step, no network requests**
- Apple-website-style minimalist design: borderless cards, gray-white layered backgrounds, a single blue accent
- Dark / light themes: follows the system by default, with a manual toggle in the top-right corner (choice is remembered)
- All data stored in browser `localStorage`; no privacy collection; mobile-first and print-friendly
- All training/diet content lives in [`js/data.js`](js/data.js) — edit one file to customize your own plan

## 🚀 Run Locally

Nothing to install — just double-click `index.html`. If you prefer a local server (optional): `python -m http.server 8000` or `npx serve .`, then visit http://localhost:8000

## 🐙 Deploy to GitHub Pages

- **Option 1 (recommended)**: push to the `main` branch — the bundled [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) **enables Pages and deploys automatically**, at `https://<username>.github.io/<repo-name>/`.
- **Option 2**: **Settings → Pages → Source**: pick the `main` branch `/ (root)` and save — no build required.

## 📋 Plan Overview (default: 183cm / 68kg)

| Phase | Period | Frequency | Split | Goal |
| --- | --- | --- | --- | --- |
| 1 Adaptation | Weeks 1–4 | 3 sessions/week | Full-body A/B | Master movement patterns, build the habit |
| 2 Foundation | Weeks 5–8 | 3 sessions/week | Full-body A/B/C | Repeat the basics, learn double progression |
| 3 Strength | Weeks 9–12 | 3 sessions/week | Upper/Lower/Full-body | Small load increments, deload in week 12 |
| 4 Habituation | Weeks 13–16 | 3 sessions/week | Upper/Lower/Full-body | Train independently and complete a cycle review |

48 sessions in total; the diet is designed around a gentle **+350 kcal/day surplus** and **2g/kg protein**, adjusted by only 150–200 kcal at a time based on weekly average weight.

## 🛠️ Customize Your Own Plan

Everything is data-driven — edit [`js/data.js`](js/data.js):

```js
const PROFILE_DEFAULT = {
  gender: "male",
  age: 25,
  height: 183,   // your height
  weight: 68,    // your weight
  activity: 1.55,
  target: 72,    // target weight
};
```

- `PHASES` / `DAY_TPL` / `WEEK_FOCUS`: phases, per-day exercise programming, and weekly focus
- `EXERCISES` / `FEATURED_EXERCISES`: the exercise library and pinned exercises
- `MEALS` / `WEEK_MEALS` / `TIPS` / `FAQS`: diet content and beginner guidance

The "Diet" page also lets you edit your profile directly on the web page and recalculates calories in real time.

## 📁 Project Structure

```
boji/
├── index.html                  # Entry page (just double-click to open)
├── css/style.css               # Dark/light theme styles (CSS-variable driven)
├── js/data.js                  # All training/diet content (edit here to customize)
├── js/app.js                   # Routing, views, charts, and localStorage logic
├── assets/exercises/           # Exercise demo images
└── .github/workflows/deploy.yml  # GitHub Pages auto deployment
```

## ⚠️ Disclaimer

The training and diet content in this project is for fitness reference only and does not constitute medical advice. Assess your own health before training, and consult a doctor if you have injuries or chronic conditions. "BOJI Fitness Club" is not liable for any loss arising from the use of this content.

## 🤝 Contributing

Issues / PRs are welcome:

- Fix description errors in the exercise library
- Add exercises / diet plans
- Improve the UI or accessibility
- Translation (i18n)

## 📝 Changelog

- **v1.4 (2026-09-03)**: visual upgrade to Apple-style minimalism (borderless, gray-white layering, single blue accent, larger typography)
- **v1.3 (2026-09-03)**: beginner-focused diet expansion (hand portions, weekly meal rotation, ingredient swaps, eating-out guide, myth FAQ); meal examples scaled to target calories
- **v1.2 (2026-09-03)**: renamed to "BOJI Fitness Club"; pinned "Big 3 Basics" with embedded Bilibili tutorials, switchable to inline SVG loop animations (respects reduced-motion preference)
- **v1.1 (2026-08-31)**: dark/light themes; tracking page focused on check-ins and completion stats; CI upgraded to Node 24 Actions with automatic Pages enablement
- **v1.0 (2026-08-31)**: beginner edition — 16 weeks at 3 sessions per week, 13 core exercises, focused diet guidance, workout check-ins and data export

## 📄 License

[MIT](LICENSE) © 2026 hequan2017
