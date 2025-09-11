# ng-quiz-app

A small multi-stage quiz project demonstrating three implementation phases. This repository is
the project snapshot for release v1.0.0.

Folders:
- `static/` — plain HTML/CSS/JavaScript (client-only)
- `ng-app/` — Angular application (source)
- `server/` — Node.js server that serves the app and stores a simple leaderboard

How to run each phase
---------------------

1) static/ (quickest - no install)

- What it is: a client-only implementation using plain HTML, CSS and JavaScript. Good for quick demos and understanding app flow.
- How to run:

    # open in default browser (macOS)
    open static/index.html

  or serve with a simple local server (recommended for same-origin fetches):

    # Python 3 built-in HTTP server
    cd static
    python3 -m http.server 8000
    # then open http://localhost:8000

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
    # if the project defines a start script, use it; otherwise run node index.js
    npm start || node index.js

  Check `server/package.json` or `server/index.js` for the configured port (commonly 3000). If needed, set an env variable:

    export PORT=3000
    npm start

- How to expose remotely (ngrok):

    # start the server first
    export PORT=3000
    npm start

    # in a separate terminal
    ngrok http 3000

  ngrok will provide a public URL that forwards to your local server.