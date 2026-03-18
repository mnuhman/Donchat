# DonChat WebSocket Server

Real-time messaging WebSocket server for DonChat application.

## Deployment on Railway (Free Tier)

### Step 1: Create New Project on Railway

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your fork of `mnuhman/Donchat`
5. Select the **root directory** (not a subdirectory)

### Step 2: Configure for WebSocket Service

Since Railway needs to deploy from root, we need to configure it:

1. In Railway Dashboard, go to **Settings**
2. Under **Root Directory**, set: `mini-services/chat-service`
3. Save changes

### Step 3: Set Environment Variables

No environment variables are required for the WebSocket server. It runs standalone.

### Step 4: Deploy

Click **Deploy** and wait for the build to complete.

### Step 5: Get Your WebSocket URL

After deployment, Railway will provide a URL like:
```
https://donchat-websocket-production-xxxx.up.railway.app
```

This is your WebSocket URL!

## Connecting from Frontend

Update your frontend environment variable:

```env
NEXT_PUBLIC_WEBSOCKET_URL=https://your-railway-app.up.railway.app
```

## Local Development

```bash
bun install
bun run dev
```

Server runs on port 3003 by default.

## Features

- Real-time private messaging
- Message status tracking (sent, delivered, read)
- Typing indicators
- Offline message queuing
- User online/offline status
- Read receipts
