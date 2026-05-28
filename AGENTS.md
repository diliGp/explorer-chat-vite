# AGENTS.md — chatapp (explorer-chat)

AI agent reference for the `chatapp` codebase.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (flat config, Next.js rules)
```

**Node requirement:** `>=20.9.0` (see `.nvmrc`)

No test framework is configured. Do not fabricate or run test commands.

## Environment

All Firebase credentials live in `.env.local` (gitignored). Required vars:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_DATABASE_URL
TENOR_API_KEY
```

Never hardcode or log these values.

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json` and respected by Next.js).

## Architecture

**Stack:** Next.js 15 App Router · React 19 · TypeScript (strict) · Firebase 12 · Zustand 5 · Tailwind CSS 3

**Key directories:**

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages |
| `src/components/chat/` | Message UI (list, bubble, input, GIF, emoji) |
| `src/components/users/` | Sidebar, user cards, profile sheet |
| `src/components/layout/` | Providers, sidebar wrapper, theme toggle |
| `src/lib/firebase/` | Firebase wrappers (auth, firestore, rtdb, storage) |
| `src/lib/hooks/` | Business logic hooks (useMessages, useAuth, useOnlineUsers, useTyping, useTheme) |
| `src/store/index.ts` | Zustand global store (persisted to `chatapp-store` in localStorage) |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/lib/utils/` | ageGate (GDPR), countries list |

## Critical Invariants

### Deterministic DM ID
DM document IDs are always: `[uid1, uid2].sort().join('_')`  
Never construct DM IDs any other way. Both participants must be sorted.

### Anonymous User Rate Limit
Anonymous users are capped at **2 consecutive unanswered messages**.  
This is enforced in **two places** — change both together or the rule breaks:
1. `src/lib/hooks/useMessages.ts` (client-side check in `sendMessage`)
2. `firestore.rules` (server-side enforcement)

### View-Once Images
Images marked `viewOnce: true` are auto-deleted from Firebase Storage **5 seconds after the recipient views them**. The delete is triggered client-side in `src/components/chat/ImageMessage.tsx`. Do not remove or delay this cleanup.

### Account Merge / UID Re-keying
When an anonymous user upgrades to a permanent account and a permanent account already exists (email/Google), all Firestore docs are re-keyed from `anonUid → permanentUid`:
- `users/{anonUid}` → `users/{permanentUid}`
- All DM docs (IDs recalculated with new UID)
- All message docs within those DMs

This logic is in `src/lib/firebase/auth.ts`. Any changes to Firestore document structure must account for this migration path.

## Firebase Security Rules

Rules live in **three files** — all must be deployed together:

```
firestore.rules        # Firestore (includes rate limiting)
database.rules.json    # Realtime Database (presence, typing)
storage.rules          # Cloud Storage (image access)
```

Deploy with: `firebase deploy --only firestore:rules,database,storage`

Do not edit rules in the Firebase console — use these files as source of truth.

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users/{uid}` | User profiles (name, age, gender, country, city, avatar, isPermanent) |
| `dms/{dmId}` | DM metadata (participants, lastMessage, lastSenderId, consecutiveCount) |
| `dms/{dmId}/messages/{msgId}` | Messages (text/image/gif, viewOnce, replyTo, reportedBy) |

Typed refs/query builders are in `src/lib/firebase/firestore.ts`. Always use these helpers instead of raw collection paths.

## Theme System

Dark mode uses CSS Variables (`--accent`, `--bg-primary`, `--text-primary`, etc.) on `<html>`.  
Mode is toggled via class (`dark`). An inline script in `src/app/layout.tsx` reads localStorage on mount to prevent flash — do not remove it.

## Online Presence & Typing

Both use **Firebase Realtime Database** (not Firestore):
- Presence: set `online: true` / `lastSeen` on connect/disconnect via `onDisconnect()`
- Typing: per-DM per-user path, auto-cleared after 2.5s timeout

Hooks: `src/lib/hooks/useOnlineUsers.ts`, `src/lib/hooks/useTyping.ts`  
Firebase wrappers: `src/lib/firebase/rtdb.ts`

## Code Style

- Strict TypeScript — no `any`, no suppressed errors
- Tailwind for all styling (no inline styles)
- React Server Components where possible; `"use client"` only when hooks/events required
- Zustand for cross-component state; local state for component-only concerns
- No direct Firestore calls in components — use hooks in `src/lib/hooks/`
