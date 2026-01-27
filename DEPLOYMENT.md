# Deployment Guide for Secret Project

This project consists of two parts:
1.  **Server (`server/`)**: Express with Socket.io (needs a persistent server).
2.  **Client (`client/`)**: React Vite App (can be hosted on Vercel).

Because the server uses WebSockets and local file storage, it cannot be hosted on Vercel's serverless platform. We will use **Render** (free tier) for the server.

---

## Part 1: Deploy Server to Render

1.  Push your code to **GitHub** (if you haven't already).
2.  Go to [Render.com](https://render.com) and create an account.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  Configure the service:
    *   **Name**: `secret-server` (or similar)
    *   **Root Directory**: `server`
    *   **Environment**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
    *   **Plan**: Free
6.  Click **Create Web Service**.
7.  Wait for deployment to finish.
8.  **Copy the Service URL** (e.g., `https://secret-server.onrender.com`). You will need this for the client.

> [!NOTE]
> Render's free tier spins down after inactivity. The first request might take a minute to load.
> **Important**: Files uploaded to the Render free tier (disk storage) are **ephemeral** and will be lost when the server restarts or deploys. For persistent storage, you would need AWS S3 or similar.

---

## Part 2: Deploy Client to Vercel

1.  Go to [Vercel.com](https://vercel.com) and sign up/login.
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  Configure the project:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Root Directory**: `client` (Edit this! It usually defaults to root).
    *   **Environment Variables**:
        *   Key: `VITE_SERVER_URL`
        *   Value: `YOUR_RENDER_SERVER_URL` (e.g., `https://secret-server.onrender.com`) - **No trailing slash**.
5.  Click **Deploy**.

---

## Part 3: Verify

1.  Open your Vercel deployment URL.
2.  Open the browser console (F12) to ensure it connected to the Render backend (no "Socket connection failed" errors).
3.  Test creating a room and sending a message.
