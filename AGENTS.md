# AGENTS.md — chatapp (explorer-chat)

AI agent reference for the `chatapp` codebase.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build (tsc -b && vite build) -> dist/
npm run preview  # Preview the production build locally
npm run lint     # ESLint (flat config, React/React Hooks rules)
```

There is no `npm run start` — this is a Vite SPA with no Node server to run in
production; `dist/` is static output for a static host (Firebase Hosting, etc.).

**Node requirement:** `>=20.9.0` (see `.nvmrc`)

No test framework is configured. Do not fabricate or run test commands.

## Environment

All Firebase credentials live in `.env.local` (gitignored). This is a Vite app,
so env vars must use the `VITE_` prefix (not `NEXT_PUBLIC_`) to be exposed to
client code via `import.meta.env` — see `src/lib/firebase/client.ts`. Required vars:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL
VITE_TENOR_API_KEY
```

Never hardcode or log these values.

## Path Alias

`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`'s
`resolve.alias` — both must stay in sync).

## Architecture

**Stack:** Vite 6 + React 19 · React Router 7 (client-side routing, see `src/App.tsx`) · TypeScript (strict) · Firebase 12 · Zustand 5 · Tailwind CSS 3

This is a client-only SPA — there is no server, no App Router, and no RSC/`"use client"` boundary. `src/app/` is a legacy directory name left over from an earlier Next.js scaffold; it is NOT Next.js App Router routing.

**Key directories:**

| Path | Purpose |
|------|---------|
| `src/app/` | Tailwind global CSS entry (`globals.css`) + favicon, imported by `src/main.tsx`. Not App Router. |
| `src/pages/` | Route-level components, wired up in `src/App.tsx` via `react-router-dom` |
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
1. `src/lib/hooks/useMessages.ts` — `commitMessage()`'s precheck. This is a
   `writeBatch` (not a transaction — transactions force a server read before any
   local echo, which made anon sends feel slow; see git history), so the
   precheck is computed from the caller's last-known real-time DM state
   (`lastSenderId`/`consecutiveSenderCount`/`bothReplied`, passed into
   `useMessages()` as primitives by `Dm.tsx`), not a fresh read. It's a
   prediction for fast UX feedback (throws `RateLimitError` immediately when
   obviously over the limit), not the enforcement.
2. `firestore.rules` — `canCreateMessage()` (the actual enforcement: reads the
   DM's committed state server-side, so it can't be bypassed by skipping step 1)
   and `dmSendMetadataUpdateIsValid()` (prevents directly rewriting
   `consecutiveSenderCount`/`bothReplied`/`lastSenderId` on the dm doc to fake a
   reset). If step 1's cached state is stale (e.g. two tabs racing), the rule
   rejects the write and `commitMessage()` remaps the resulting
   `permission-denied` back into a `RateLimitError` — so correctness never
   depends on the client's cache being fresh, only the UX does.
   Known gap: `dmClearResetIsValid()` accepts clearChat's reset shape without
   verifying the messages subcollection is actually empty (rules can't run
   aggregate queries) — a crafted client write can reuse that shape to reset the
   counter early. Accepted as low-severity: this limit is anti-spam UX scoped to
   one 1:1 conversation, not a boundary protecting other users' data.

### View-Once Images
Images marked `viewOnce: true` are auto-deleted from Firebase Storage **5 seconds after the recipient views them**. The delete is triggered client-side in `viewImage()` in `src/lib/hooks/useMessages.ts` (there is no `ImageMessage.tsx` delete call). Do not remove or delay this cleanup.
Known gap: the 5s delay is a plain `setTimeout` — closing the tab within that window leaves the Storage object orphaned. There is no server-side sweep for this; a scheduled Cloud Function would be needed to close it fully.

### Account Merge / UID Re-keying
When an anonymous user upgrades to a permanent account and a permanent account already exists (email/Google), all Firestore docs are re-keyed from `anonUid → permanentUid`:
- `users/{anonUid}` → `users/{permanentUid}`
- All DM docs (IDs recalculated with new UID)
- All message docs within those DMs

This logic is in `src/lib/firebase/auth.ts`. Any changes to Firestore document structure must account for this migration path.

### Reported Messages & Moderation
`reportMessage()` (`src/lib/hooks/useMessages.ts`) sets two fields together on
the message doc, and they must stay in sync — `reportedBy: arrayUnion(uid)`
(source of truth for the reporter list *and* count, via `.length`) and
`isReported: true` (a denormalized boolean that exists solely because Firestore
can't query "array is non-empty" — it's the query flag for `/admin/reports`,
not a count).

**Access control is `firestore.rules`' `isAdmin()`, nothing in the client.**
`isAdmin()` reads `users/{uid}.isAdmin`, which:
- Can only be set manually via Firebase Console — the `users/{uid}` update rule
  pins `isAdmin` to its current value, so no app code path (and no user) can
  set it on themselves. There is no admin-management UI by design.
- Gates both the messages `allow read` (so `/admin/reports`'s
  `collectionGroup('messages')` query can cross every DM) and a dedicated
  branch of the messages `allow update` (`isReported`/`reportedBy`/`deletedAt`/
  `text`/`mediaRef`/`gifUrl` only — see `src/lib/firebase/moderation.ts`'s
  `dismissReport`/`deleteReportedMessage`).
- The `/admin/reports` route guard in `src/pages/AdminReports.tsx` is cosmetic
  only (redirects non-admins to `/` so they don't see a blank/erroring page) —
  it is not itself a security boundary.

**Known gap:** `isReported` was added after `reportedBy` existed. Any message
reported before this field was introduced still has `reportedBy` populated but
no `isReported: true`, so it won't appear in `/admin/reports`. No backfill
migration has been run.

Requires a `messages` collection-group index (`isReported` ASC, `createdAt`
DESC) — see `firestore.indexes.json`.

### Session Inactivity Auto-Logout
`src/lib/hooks/useAuth.ts` signs a user out after N minutes with no activity
(mouse/keyboard/touch/scroll, or the tab being hidden). `N` defaults to 5 and
is remote-configurable via `config/featureFlags.inactivityLogoutMinutes` (same
Firestore doc/pattern as the ad flags in `useFeatureFlags.ts`) — changeable
from Firebase Console with no redeploy; `<= 0` disables the feature entirely.

This is a **separate mechanism** from the pre-existing "mark presence offline
while idle" behavior in the same file (fixed 5 min, not configurable, controls
only the online/offline dot). Notably, the logout countdown is **not** reset
or paused when the tab is hidden — backgrounding the tab is itself a form of
inactivity — whereas the presence-idle timer goes offline immediately on hide.

Uses `signOutPreservingData()` (`src/lib/firebase/auth.ts`), never
`logout()`'s `deleteAnonUser()` path: an idle timeout must never silently wipe
an anonymous user's chat history the way the explicit "Leave & delete" button
does. For anonymous users this still effectively abandons that identity
(Firebase anonymous credentials can't be signed back into), so their data
becomes orphaned rather than deleted — `onAuthChange` immediately establishes
a fresh anonymous session after, same as any other sign-out, and the user
lands on `/onboarding` as a new guest. A signed-out permanent user follows the
same path — they don't see a distinct "signed out" screen, just onboarding.

The activity-listener effect is keyed on `currentUser?.uid`, not on the raw
`onAuthChange` event — required because a freshly-onboarded user gets their
profile via `ProfileForm.tsx` calling `setCurrentUser()`/`setupPresence()`
directly, with no new auth event to hook into.

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
| `users/{uid}` | User profiles (name, age, gender, country, city, avatar, isPermanent, isAdmin) |
| `dms/{dmId}` | DM metadata (participants, lastMessage, lastSenderId, consecutiveCount) |
| `dms/{dmId}/messages/{msgId}` | Messages (text/image/gif, viewOnce, replyTo, reportedBy, isReported) |

Typed refs/query builders are in `src/lib/firebase/firestore.ts`. Always use these helpers instead of raw collection paths.

## Theme System

Dark mode uses CSS Variables (`--accent`, `--bg-primary`, `--text-primary`, etc.) on `<html>`.
Mode is toggled via class (`dark`). An inline script in `index.html`'s `<head>` reads the persisted Zustand store (`localStorage['chatapp-store']`) on load to prevent a flash-of-wrong-theme — do not remove it.

## Online Presence & Typing

Both use **Firebase Realtime Database** (not Firestore):
- Presence: set `online: true` / `lastSeen` on connect/disconnect via `onDisconnect()`
- Typing: per-DM per-user path, auto-cleared after 2.5s timeout

Hooks: `src/lib/hooks/useOnlineUsers.ts`, `src/lib/hooks/useTyping.ts`  
Firebase wrappers: `src/lib/firebase/rtdb.ts`

## Code Style

- Strict TypeScript — no `any`, no suppressed errors. (Note: `src/lib/firebase/auth.ts` and parts of `useMessages.ts` currently cast Firestore doc data via `as any` — pre-existing debt, not a pattern to copy.)
- Tailwind for all styling (no inline styles)
- Client-only React (Vite SPA) — there are no Server Components and no `"use client"` directives; this is not Next.js
- Zustand for cross-component state; local state for component-only concerns
- No direct Firestore calls in components — use hooks in `src/lib/hooks/`
