# 📱 WhatsApp Channel → Group Forwarder

Automatically forwards messages from WhatsApp Channels to your WhatsApp Group — **without** the "Forwarded from" label.

> ⚠️ **Warning:** Uses an unofficial WhatsApp library (`whatsapp-web.js`). Use a **spare phone number** — your account could be banned by WhatsApp.

---

## 📋 Requirements

- **Node.js v18+** — https://nodejs.org
- **Google Chrome** installed (used by Puppeteer)
- A spare WhatsApp number (recommended)
- WhatsApp Channels you already follow on your phone

---

## 🚀 First-Time Setup (Step by Step)

### Step 1 — Install dependencies

Open PowerShell in the project folder and run:

```powershell
$env:PUPPETEER_SKIP_DOWNLOAD="true"; npm install
```

> ✅ Use `$env:` syntax in PowerShell (NOT `set VAR=value` — that's CMD syntax)

---

### Step 2 — Find your Group ID

```powershell
node get-ids.js
```

- Scan the QR code with WhatsApp on your phone
- Copy the **Group ID** from the output (looks like `120363XXXXXXXXXX@g.us`)

---

### Step 3 — Find your Channel IDs

```powershell
node find-channels.js
```

- Leave it running — whenever one of your followed channels posts a message, its ID appears:
  ```
  🔔  NEW CHANNEL DETECTED!
    Name : Chai Aur Code
    ID   : 120363424501980779@newsletter
  ```
- Press **Ctrl+C** to stop — it prints a final summary of all detected channel IDs

---

### Step 4 — Configure your `.env` file

Edit the `.env` file and fill in the IDs:

```env
TARGET_GROUP_ID=120363426449627430@g.us

# One channel:
SOURCE_CHANNEL_IDS=120363424501980779@newsletter

# Multiple channels (comma-separated):
SOURCE_CHANNEL_IDS=120363424501980779@newsletter,9876543210@newsletter

# Leave EMPTY to forward from ALL channels you follow:
SOURCE_CHANNEL_IDS=

# Optional: only forward messages containing these words:
FILTER_KEYWORDS=sale,urgent,breaking
```

---

### Step 5 — Start the bot

```powershell
node index.js
```

You should see:
```
🚀  Bot is ready!
   Target group  : 120363426449627430@g.us
   Watching      : 120363424501980779@newsletter
   Keywords      : All messages
```

The bot is now live! Session is saved — no QR scan needed next time.

---

## 🔄 How to Change Channel or Group IDs

1. Edit `.env` and update `TARGET_GROUP_ID` or `SOURCE_CHANNEL_IDS`
2. **Kill any running bot** (see below)
3. Restart: `node index.js`

To discover new channel IDs, run `node find-channels.js` and wait for channel activity.

---

## 🛑 How to Kill the Bot / Background Processes

When you see this error:
```
Error: The browser is already running for ...session-channel-forwarder
```

It means a Chrome or Node process is still running. Kill it with:

```powershell
# Kill headless Chrome processes
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq "" } | Stop-Process -Force

# Remove the lock file
Remove-Item -Force ".wwebjs_auth\session-channel-forwarder\SingletonLock" -ErrorAction SilentlyContinue
```

Then run `node index.js` again.

**One-liner (copy-paste ready):**
```powershell
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq "" } | Stop-Process -Force; Start-Sleep -Milliseconds 800; Remove-Item -Force ".wwebjs_auth\session-channel-forwarder\SingletonLock" -ErrorAction SilentlyContinue; node index.js
```

---

## 📁 File Overview

| File | Purpose |
|------|---------|
| `index.js` | Main bot — forwards channel messages to group |
| `get-ids.js` | Lists all your WhatsApp groups |
| `find-channels.js` | Detects channel IDs from live incoming messages |
| `.env` | Your configuration (group ID, channel IDs, keywords) |
| `env.example` | Template for `.env` |

---

## ⚙️ npm Scripts

```powershell
npm start           # Start the bot (node index.js)
npm run get-ids     # List your groups
npm run find-channels  # Detect channel IDs live
```

---

## 🧠 How It Works

1. Bot connects to WhatsApp Web using your session
2. Listens for messages from channels (IDs ending with `@newsletter`)
3. Filters by source channel & keywords (if configured)
4. Re-sends the content (text / media) directly to your group — **no "Forwarded" badge**

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| `PUPPETEER_SKIP_DOWNLOAD` error | Use `$env:PUPPETEER_SKIP_DOWNLOAD="true"` in PowerShell |
| `The browser is already running` | Run the kill command above, then restart |
| Channels not found in `get-ids.js` | Use `find-channels.js` instead — it detects them live |
| Bot not forwarding | Check `.env` has correct IDs; restart bot after any change |
| QR code keeps appearing | Delete `.wwebjs_auth` folder to reset session |
