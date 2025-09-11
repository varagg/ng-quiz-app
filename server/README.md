# server/

This folder contains the Node.js hostable version of the quiz app. It serves the frontend and provides a lightweight leaderboard API.

Quick start (macOS / zsh)

1. Install dependencies

    cd server
    npm install

2. Start (default port 3000)

    # start using npm script (recommended if package.json has "start")
    npm start

    # or run directly
    node index.js

3. Override port (example: 4000)

    export PORT=4000
    npm start

4. Run in background with pm2 (optional)

    npm install -g pm2
    export PORT=3000
    pm2 start index.js --name ng-quiz-server --env production

Notes

- Confirm the actual entry file and start script in `server/package.json`.
- If the server uses environment variables for configuration (DATABASE_URL, API_KEY, etc.), set them before starting.
- For remote sharing during development, use ngrok:

    ngrok http 3000

Security

- Do not commit secrets to the repository. Use environment variables or a secrets manager.
- Limit public endpoints when exposing the server to the internet.

Troubleshooting

- If the port is already in use, pick a different `PORT` or stop the process using that port.
- Check `server/logs` or `server/server.log` (if present) for runtime errors.
