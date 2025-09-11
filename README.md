# ng-quiz-app

A lightweight quiz application built with Angular for the frontend and a minimal Node server for hosting APIs and static assets. This repository contains three pieces:

- `static/` — Prebuilt static bundle and a ready-to-serve demo
- `ng-app/` — Angular 15 app (source, tests, build)
- `server/` — Simple Node/Express server used for running the app and an optional leaderboard API

---

## What is this project

ng-quiz-app is a small, opinionated quiz/demo that showcases:

- Angular single-page application structure
- Unit tests using Karma + Jasmine
- CI automation with GitHub Actions (build & test)
- Simple Node server for hosting and demoing features

It's a good starter project to demonstrate Angular skills to reviewers and to extend with additional features (auth, persistence, scoring rules, analytics).

---

## The three quiz phases

The quiz is split into three intuitive phases that map to the user flow:

1) Preparation (Start)
- User lands on the quiz page, reads instructions, and starts the quiz.
- The app may load question data from `assets/questions.json` or from the server API.

2) Question loop (Play)
- The user answers multiple-choice questions one at a time.
- The UI provides immediate feedback (optional sound), progress, and a timer if enabled.
- The app tracks answers for scoring.

3) Result and visualization (Finish)
- After the last question the app shows a result summary: score, correct/incorrect breakdown, and visualizations.
- Optionally posts the score to a leaderboard API (server) and displays rankings.

---

## Use cases

- Educational demos and coding interviews
- Lightweight quiz/gamified experiences for small teams or classrooms
- Starter template for Angular beginners to learn testing and CI
- Showcasing a full-stack (frontend + simple backend) example in a portfolio

---

## How to run (static/ng-app/server)

1) static/ (quickest - no install)

- What it is: a client-only implementation using plain HTML, CSS and JavaScript. Good for quick demos and understanding app flow.
- How to run:

### open in default browser (macOS)
open static/index.html

or serve with a simple local server (recommended for same-origin fetches):

### Python 3 built-in HTTP server
cd static
python3 -m http.server 8000
then open http://localhost:8000

Notes:
- No Node or build step required.
- Use the simple server if the app fetches `assets/questions.json` to avoid CORS/file access issues.

2) ng-app/ (development - Angular source)

- What it is: the Angular source code and configuration. Use this for development or to build a production bundle.
- Prerequisites: Node.js (>=14 recommended), npm or yarn, Angular CLI (optional but helpful).
- How to run (development):

cd ng-app
npm install
npm start

This runs the Angular dev server (check `package.json` scripts; `npm start` typically runs `ng serve`). Open the printed URL (usually http://localhost:4200).

- How to build (production):

cd ng-app
npm install
npm run build -- --prod

The compiled output will be under `ng-app/dist/` (or as configured in `angular.json`). You can then serve the built files with any static server.

3) server/ (hostable / upgraded version)

- What it is: the hostable Node.js server that can serve the app and provide server-side features like a leaderboard. This is the recommended folder to run when exposing the app (for example via ngrok).
- Prerequisites: Node.js (>=14 recommended), npm.
- How to run locally:

cd server
npm install

### if the project defines a start script, use it; otherwise run node index.js
npm start || node index.js

Check `server/package.json` or `server/index.js` for the configured port (commonly 3000). If needed, set an env variable:

export PORT=3000
npm start

- How to expose remotely (ngrok):

### start the server first
export PORT=3000
npm start

### in a separate terminal
ngrok http 3000

ngrok will provide a public URL that forwards to your local server.

---

## Future improvements (ideas)

- ESLint + Husky pre-commit linting
- Dependabot and Scheduled dependency updates
- Test coverage reporting and coverage gate in CI
- Production deployment (GitHub Pages, Netlify, or Docker image)