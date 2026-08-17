# Futa Football Community PWA

A progressive web app for local football communities to:

- announce local matches
- request and discover friendlies
- chat and share comments
- report match results

The app is built with React + TypeScript + Vite and configured as an installable PWA.

## Features

- Matches page with upcoming fixture announcements
- Friendlies board with submission form and open requests list
- Match result reporting form and recent results feed
- Community chat/comments stream
- Team profile section
- PWA support with manifest and service worker caching

## Tech Stack

- React 19
- TypeScript
- React Router
- Vite
- vite-plugin-pwa

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the app locally:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## PWA Notes

- In supported browsers, you can install the app to home screen/desktop.
- Service worker registration is enabled with auto update.
- Manifest icon files are in `public/`.

## Next Improvements

- Add authentication for team managers and admins
- Persist data using a backend (Supabase/Firebase/Node API)
- Add real-time chat using WebSocket
- Add role-based moderation for comments and result approvals
# futa
