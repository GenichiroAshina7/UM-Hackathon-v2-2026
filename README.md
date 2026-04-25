# UpStart — Installation & Setup

## Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **GLM API key** — Get one at [open.bigmodel.cn](https://open.bigmodel.cn)

Verify installations:

```bash
python3 --version   # should be 3.10 or higher
node --version      # should be 18 or higher
npm --version
```

---

## 1. Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Edit `backend/.env` and replace the placeholder with your actual API key:

```
GLM_API_KEY=your_glm_api_key_here
GLM_BASE_URL=https://api.ilmu.ai/anthropic
```

Start the server:

```bash
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

---

## 2. Frontend

Open a **new terminal** (keep the backend running), then:

```bash
cd frontend

# Install npm dependencies
npm install

# Start the Expo dev server
npx expo start
```

From the Expo menu:

- Press **w** to open in a browser
- Press **i** for iOS simulator (requires Xcode on macOS)
- Press **a** for Android emulator (requires Android Studio)
- Scan the QR code with the **Expo Go** app on your phone

The frontend connects to `http://localhost:8000` by default. To change this, update `extra.API_BASE_URL` in `frontend/app.json`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pip` not found | Try `pip3` instead, or reinstall Python with "Add to PATH" checked |
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then retry |
| Can't reach backend from phone | Use your computer's local IP (e.g. `http://192.168.x.x:8000`) instead of `localhost` in `app.json` |
| API returns 401 | Check that your `GLM_API_KEY` in `.env` is correct and has no extra whitespace |


Note: If all things fail, even troubleshooting too, just use the Claude Extension to troubleshoot as a last resort. 
