# ChatApp

A real-time 1:1 anonymous chat app — text, GIFs, and view-once images, with live
presence, typing indicators, and an optional upgrade path from anonymous to a
permanent (Google / email) account.

**Stack:** Vite 6 + React 19 · React Router 7 · TypeScript (strict) · Firebase 12
(Auth, Firestore, Realtime Database, Storage) · Zustand 5 · Tailwind CSS 3

This is a client-only single-page app — there is no Node server. `npm run build`
produces static output in `dist/`, deployed to Firebase Hosting (see `firebase.json`).
It is **not** Next.js, despite `src/app/` being a leftover directory name from an
earlier scaffold (see [Project Structure](#project-structure)).

## Quick Start

```bash
nvm use          # switches to the Node version in .nvmrc
npm install
cp .env.local.example .env.local   # then fill in your Firebase config — see below
npm run dev      # http://localhost:5173
```

**Node requirement:** `>=20.9.0` (`.nvmrc` pins a specific version for local dev
consistency).

First-run flow: age gate → profile form (name, age, gender, country) → anonymous
Firebase sign-in fires automatically → you appear in the online users list. Open
a second browser tab (or incognito window) to test a 1:1 DM against yourself.

## Scripts

```bash
npm run dev           # Start the Vite dev server
npm run build          # tsc -b && vite build -> dist/
npm run preview        # Preview the production build locally
npm run lint           # ESLint (flat config, React/React Hooks rules)
npm run lint:fix       # ESLint with --fix
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```

There is no `npm run start` — this is a static SPA, not a Node server.

## Environment Variables

All Firebase credentials live in `.env.local` (gitignored, never commit it). This
is a Vite app, so client-exposed env vars **must** use the `VITE_` prefix (not
`NEXT_PUBLIC_`) — see `src/lib/firebase/client.ts`.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
VITE_TENOR_API_KEY=
```

Full instructions for provisioning a Firebase project, enabling Auth/Firestore/
RTDB/Storage, and deploying security rules are in **[SETUP.md](./SETUP.md)**.

## Project Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Tailwind global CSS entry (`globals.css`) + favicon, imported by `src/main.tsx`. **Not** Next.js App Router — the name is a holdover from an earlier scaffold. |
| `src/pages/` | Route-level components, wired up in `src/App.tsx` via `react-router-dom` |
| `src/components/chat/` | Message UI — list, bubble, input, GIF picker, emoji picker, view-once image |
| `src/components/users/` | Sidebar, user cards, profile sheet |
| `src/components/layout/` | Sidebar wrapper, theme toggle, ad slot |
| `src/lib/firebase/` | Firebase wrappers (`auth.ts`, `firestore.ts`, `rtdb.ts`, `storage.ts`, `client.ts`) |
| `src/lib/hooks/` | Business logic hooks (`useMessages`, `useAuth`, `useOnlineUsers`, `useRecentChats`, `useTyping`, `useTheme`, `useFeatureFlags`) |
| `src/store/index.ts` | Zustand global store, persisted to `localStorage['chatapp-store']` |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/lib/utils/` | Age gate (GDPR), countries list |

Path alias: `@/*` → `./src/*`, configured in both `tsconfig.json` and
`vite.config.ts`'s `resolve.alias` — keep both in sync if it ever changes.

## Data Model

```
users/{uid}                        Firestore — profile: name, age, gender, country,
                                    isPermanent, isOnline, blockedUsers[], ...

dms/{dmId}                         Firestore — dmId = [uid1, uid2].sort().join('_')
  ├─ participants, participantNames/Genders/Countries
  ├─ lastMessageAt, lastMessagePreview, lastSenderId
  ├─ consecutiveSenderCount, bothReplied   (anon rate-limit state — see below)
  └─ lastReadAt{}, blockedBy[]

dms/{dmId}/messages/{msgId}        Firestore — text/image/gif, replyTo, reportedBy[]

presence/{uid}                     Realtime Database — online/lastSeen, via onDisconnect()
typing/{dmId}/{uid}                Realtime Database — boolean, auto-cleared after 2.5s

dm-images/{dmId}/{msgId}/img       Storage — view-once images, deleted ~5s after viewing
avatars/{uid}/avatar               Storage — profile avatars, ≤2MB
```

## Notable Behavior

- **Anonymous rate limit** — anonymous users can send at most 2 consecutive
  unanswered messages per DM; the limit lifts permanently once both sides have
  replied. Enforced in both `src/lib/hooks/useMessages.ts` (client UX) and
  `firestore.rules` (server-side) — see `AGENTS.md` for the exact invariant.
- **Account upgrade** — an anonymous user can link a Google or email/password
  credential (`/register`) without losing their UID or chat history. If that
  credential already belongs to an existing account, `src/lib/firebase/auth.ts`
  re-keys all of the anonymous user's DMs and messages onto the permanent UID.
- **View-once images** — deleted from Storage ~5 seconds after the recipient
  opens them (client-triggered; see `AGENTS.md` for the known tab-close gap).
- **Real-time everywhere** — messages and DM metadata via Firestore `onSnapshot`;
  presence and typing via Realtime Database (`onDisconnect()` handles offline
  detection automatically, no cleanup function needed).

## More

- **[SETUP.md](./SETUP.md)** — full Firebase project setup, security rules
  deployment, and production deployment guide.
- **[AGENTS.md](./AGENTS.md)** — architecture reference and critical invariants
  for anyone (human or AI) making changes to this codebase.
