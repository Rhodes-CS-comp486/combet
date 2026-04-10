# Combet 

> A social betting app — make bets, join circles, and settle the score with friends.

Live at [combet.live](https://combet.live)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Running the App](#running-the-app)

---

## Overview

Combet is a mobile social betting platform where users make friendly bets, organize into circles, follow each other, and track their wins and losses over time. Built with Expo/React Native on the frontend and Express + PostgreSQL on the backend.

---

## Features

-  **Bets** — Create, accept, and settle bets with other users
-  **Circles** — Group friends into themed circles with custom icons and colors
-  **Profiles** — View bet history across five tabs: All, My Turn, In Progress, Settled, and Circles
-  **Follow System** — Follow other users; private accounts require follow request approval
-  **Notifications** — Get notified about circle invites, follow requests, join requests, and bet deadline reminders
-  **Wins & Losses** — Profile stats that reflect real settled bet outcomes
-  **Leaderboard** - See how you rank against others across your circles

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | Expo, React Native, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |

---

## Architecture

```
combet/
├── frontend/               # Expo/React Native app
│   ├── app/                # File-based routing (Expo Router)
│   ├── components/         # Shared UI components (BetCard, etc.)
│   └── constants/          # AVATAR_ICONS map and other constants
│
└── backend/                # Express API server
    ├── routes/             # Route handlers (users, bets, circles, inbox)
    ├── db/                 # PostgreSQL pool and query helpers
    └── jobs/               # Cron jobs (bet deadline reminders)
```

---

## Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [PostgreSQL](https://www.postgresql.org/) v14+
- A physical device or simulator (iOS Simulator / Android Emulator)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/combet.git
cd combet
```

### 2. Install dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Configure environment variables

**Backend — create `backend/.env`:**
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/combet
JWT_SECRET=your_jwt_secret
PORT=3000
```

**Frontend — create `frontend/.env`:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 4. Set up the database

```bash
# Create the database
createdb combet

# Run migrations
cd backend
npm run migrate
```

---

## Running the App

**Start the backend:**
```bash
cd backend
npm run dev
```

**Start the frontend (in a separate terminal):**
```bash
cd frontend
npx expo start
```

Then press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone.