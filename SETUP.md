# ChatApp — Setup & Deployment Guide

> Vite 6 + React Router 7 · React 19 · Firebase 12 · Node
> Estimated time to production: **~45 minutes** on first setup

This is a client-only SPA (no Node server). `npm run build` outputs static
files to `dist/`, which is what actually gets deployed — see Step 7.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build tool | Vite | 6.x |
| Routing | React Router (client-side) | 7.x |
| UI | React | 19.x |
| Language | TypeScript | 5.8.3 |
| Styling | Tailwind CSS | 3.4.17 |
| Backend | Firebase | 12.13.0 |
| State | Zustand | 5.0.13 |

---

## Prerequisites

| Tool | Min version | Notes |
|------|-------------|-------|
| Node.js | `>=20.9.0` per `package.json`'s `engines` field; `.nvmrc` pins `26` for local dev consistency | `node -v` — use `nvm use` if using nvm |
| npm | comes with your Node install | |
| Firebase CLI | 12.x | `npm install -g firebase-tools` |
| Google account | — | for Firebase Console access |

> **nvm users:** A `.nvmrc` file is included. Run `nvm use` in the project root to auto-switch.

---

## Why Two Firebase Databases?

This app uses both **Cloud Firestore** and **Realtime Database (RTDB)** — each for what it does best:

### Cloud Firestore — persistent, structured data
- User profiles (`/users/{uid}`)
- DM conversation documents (`/dms/{dmId}`)
- Chat messages (`/dms/{dmId}/messages/{msgId}`)

Firestore excels at rich querying, offline persistence, and scaling to millions of documents. Data lives until explicitly deleted.

### Realtime Database (RTDB) — ephemeral, low-latency live state
- Online presence (`/presence/{uid}` — who's online right now)
- Typing indicators (`/typing/{dmId}/{uid}` — is someone typing *right now*)

RTDB has a killer feature unavailable in Firestore: **`onDisconnect()`**. When a user's connection drops (tab close, network loss, phone lock), Firebase automatically writes `online: false` to their presence node server-side — no client code needed, no cleanup Cloud Function required.

| | Firestore | RTDB |
|---|---|---|
| `onDisconnect()` auto-cleanup | ❌ | ✅ |
| Rich queries & indexes | ✅ | ❌ |
| Nested collections | ✅ | ❌ (flat JSON tree) |
| Typical read latency | ~100ms | ~10ms |
| Cost model | per document read/write | per GB transferred |
| Offline persistence | ✅ | limited |

Presence and typing are perfect RTDB use cases: they're tiny, update dozens of times per minute, and *must* self-clean when users disconnect. Putting them in Firestore would be expensive and require a Cloud Function for disconnect cleanup.

---

## Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name (e.g. `chatapp-prod`)
3. Disable Google Analytics if not needed → **Create project**

---

## Step 2 — Enable Firebase Services

### Authentication
1. Console → **Authentication** → **Get started**
2. **Sign-in method** tab → enable **Anonymous**
3. Also enable **Google** (for account upgrade):
   - Click **Google** → toggle Enable
   - Set **Project support email** to your email → **Save**
4. Also enable **Email/Password** (for account upgrade):
   - Click **Email/Password** → toggle Enable → **Save**

### Firestore Database
Stores all persistent data: user profiles, DM conversations, messages.

1. Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** (rules deployed next)
3. Pick a region close to your users (e.g. `us-central1`)
4. Click **Enable**

### Realtime Database (RTDB)
Stores live ephemeral state: online presence and typing indicators. Uses `onDisconnect()` for automatic cleanup when users go offline.

1. Console → **Realtime Database** → **Create database**
2. Choose the **same region** as Firestore (e.g. `us-central1`)
3. Choose **Start in locked mode** → **Enable**
4. Copy the database URL shown (looks like `https://your-project-default-rtdb.firebaseio.com`)
   — you'll need it in Step 4

### Storage
Stores view-once images (auto-deleted after viewing).

1. Console → **Storage** → **Get started**
2. Choose **Start in production mode** → pick same region → **Done**

### Authorized Domains (for Google Sign-in)
1. Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your production domain (e.g. `chatapp.example.com`)
3. `localhost` is already listed (for dev)

---

## Step 3 — Get Firebase Config Keys

1. Console → **Project Settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click the web icon `</>`
3. Register app with a nickname → **Register app**
4. Copy the `firebaseConfig` object — you'll use these values in Step 4

---

## Step 4 — Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your real values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Tenor GIF API — free key from https://developers.google.com/tenor
VITE_TENOR_API_KEY=your_tenor_api_key
```

> **Note:** This is a Vite app, so client-exposed vars must use the `VITE_`
> prefix (not `NEXT_PUBLIC_`) to be readable via `import.meta.env` — see
> `src/lib/firebase/client.ts`. All `VITE_` variables are bundled into
> client-side JS. Never put secret keys (service account, etc.) in them.

### Get a Tenor API Key
1. Go to [developers.google.com/tenor](https://developers.google.com/tenor)
2. Sign in → **Get started** → create a project
3. Copy the **API key** → paste into `VITE_TENOR_API_KEY`

---

## Step 5 — Deploy Firebase Security Rules

```bash
# Login to Firebase CLI
firebase login

# Link this directory to your Firebase project
firebase use --add
# → select your project → give it an alias like "default"

# Deploy all rules + indexes at once
firebase deploy --only firestore,database,storage
```

This deploys:
- `firestore.rules` — document-level access control (participants only)
- `firestore.indexes.json` — composite indexes for DM queries
- `database.rules.json` — RTDB presence + typing rules (owner-only writes)
- `storage.rules` — image upload/download restrictions (signed-in, ≤2 MB, images only)

> **Verify deployment:** Console → Firestore → **Rules** tab should show the new rules.

---

## Step 6 — Run Locally

```bash
nvm use        # switches Node version via .nvmrc
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (Vite's default dev port)

**First-run flow:**
1. Age gate + profile form (name, age, gender, country)
2. Anonymous Firebase auth fires automatically
3. Your presence appears in the online users list (via RTDB)
4. Open a second browser tab / incognito window to test 1:1 DM

---

## Step 7 — Deploy to Production

Since this is a static Vite build, deployment is just "build, then upload
`dist/` to any static host." `firebase.json` and `.firebaserc` are already
configured for this app (`public: "dist"`, SPA rewrite to `/index.html`,
project alias `ex-chat-beedd`), so Firebase Hosting is the path of least
resistance and needs no extra config.

### Option A: Firebase Hosting (already configured — recommended)

```bash
npm run build                              # -> dist/
firebase deploy --only hosting             # uses firebase.json + .firebaserc
```

That's it — no Dockerfile, no server, no `output: 'standalone'` (this isn't
Next.js). You can deploy hosting together with the security rules in one
command:

```bash
firebase deploy --only hosting,firestore,database,storage
```

**Custom domain:** Console → **Hosting** → **Add custom domain** → follow the
DNS verification steps.

**CI/CD:** `firebase-tools` supports GitHub Actions out of the box —
`firebase init hosting:github` scaffolds a workflow that builds and deploys
`dist/` on every push, if you want that instead of deploying by hand.

### Option B: Any other static host (Vercel, Netlify, Cloudflare Pages, S3+CDN, …)

Since `dist/` is a plain static SPA build, any static host works:

1. Build command: `npm run build`
2. Output directory: `dist`
3. Set the same `VITE_*` environment variables from `.env.local` in the host's
   dashboard (build-time — Vite inlines them at build, not at runtime)
4. Configure an SPA fallback/rewrite (all paths → `/index.html`) — most static
   hosts have a one-line config option for this; without it, deep links like
   `/dm/<id>` will 404 on refresh.

There is no framework auto-detection needed since there's no framework-specific
server — it's a static bundle like any other Vite/CRA/plain SPA output.

---

## Step 8 — Post-Deployment Checklist

- [ ] Open the app URL and complete onboarding
- [ ] Open an incognito window, create a second user, start a DM
- [ ] Send a text message, GIF, and image — verify view-once works
- [ ] Verify typing indicator shows when the other user is typing
- [ ] Close a tab — verify the user disappears from the online list (RTDB `onDisconnect`)
- [ ] Test dark/light theme toggle
- [ ] Check Firestore Console → **Usage** tab for rule denials (should be none)
- [ ] Test on mobile (Chrome DevTools device simulation or real device)
- [ ] Verify the Privacy Policy and Terms pages load at `/privacy-policy` and `/terms`

---

## Data Model

### Cloud Firestore (persistent data)

```
/users/{uid}
  uid, name, age, gender, country, city?, isPermanent,
  isOnline, lastSeen, createdAt, blockedUsers[], reportCount,
  isAdmin?   # grants /admin/reports access — console-only, see Moderation below

/dms/{dmId}                    # dmId = [uid1, uid2].sort().join('_')
  participants[], participantNames{}, participantGenders{},
  participantCountries{}, createdAt, lastMessageAt,
  lastMessagePreview, unreadCount,
  lastSenderId, consecutiveSenderCount

/dms/{dmId}/messages/{msgId}
  dmId, senderId, senderName, type (text|image|gif),
  text?, gifUrl?, mediaRef?, mediaThumbnail?, mediaViewed,
  replyTo?, createdAt, deletedAt?, reportedBy[], isReported?
```

### Realtime Database (live ephemeral state)

```
/presence/{uid}          # Written on connect, cleared by onDisconnect()
  online: boolean
  lastSeen: number (ms)

/typing/{dmId}/{uid}     # true while user is typing, false/removed on stop
  boolean
```

### Firebase Storage (view-once images)

```
/dm-images/{dmId}/{msgId}/{filename}
  # Deleted ~5s after recipient views it
```

---

## Account Upgrade Flow

Anonymous users see a **"Save Account"** link in the sidebar footer.  
Route: `/register`

- **Google:** `linkWithPopup(auth.currentUser, googleProvider)` — one click
- **Email/Password:** `linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password))`

After upgrade, `isPermanent: true` and the user's `email` (plus Google `displayName` if applicable) are written to the Firestore profile.

### UID preservation (happy path)
Firebase's `linkWith*` functions keep the **same anonymous UID** — all messages, DMs, and profile data remain untouched automatically.

### Credential-already-in-use merge
If the Google account or email the user chooses is **already registered** as a permanent account, Firebase throws `auth/credential-already-in-use`. Instead of stranding the anonymous user, the app:

1. Signs into the existing permanent account
2. Finds every DM where the anonymous UID appears in `participants`
3. Re-keys `participants`, `participantNames`, `participantGenders`, `participantCountries` — replacing the anon UID with the permanent UID (atomically via Firestore batch write)
4. Migrates all messages in affected DMs (`senderId`, `dmId` fields updated)
5. Copies the anonymous user's profile to the permanent UID (if the permanent account has no profile yet), then deletes the anonymous profile
6. Shows a "Your chats have been merged" toast

The user lands on their permanent account with all previous chat history intact.

---

## Moderation

Users can report a message (writes `reportedBy`/`isReported` on the message
doc). To review reports:

1. Grant yourself admin access: Firestore Console → `users/{your-uid}` → add
   field `isAdmin` (boolean) = `true`. There is no in-app way to do this —
   `firestore.rules` deliberately blocks users from setting this on themselves.
2. Open `/admin/reports` in the app (a "Reports" link appears in the sidebar
   footer once your profile has `isAdmin: true`).
3. Dismiss a report or delete the message directly from that view.

This requires the `messages` collection-group index in
`firestore.indexes.json` (`isReported` + `createdAt`) to be deployed — see
Step 5. Messages reported before `isReported` existed won't appear (no
backfill has been run); see `AGENTS.md`'s Moderation section for details.

---

## Known Limitations & Future Improvements

| Item | Status | Notes |
|------|--------|-------|
| Image expiry (view-once) | Client-side | Deleted via `setTimeout(5s)` after view. Closing the tab within that window leaks the Storage object — a Cloud Function scheduled sweep would close this gap fully. |
| Message pagination | ✅ Built | `recentMessages()` streams the live tail (50 most recent); `loadOlderMessages()` in `useMessages.ts` cursor-paginates further back on demand ("Load earlier messages" in the UI). |
| Push notifications | Not built | Firebase Cloud Messaging (FCM) can add web push. Requires a service worker. |
| Anonymous send rate-limit | ✅ Built | Anonymous users can send at most 2 consecutive unanswered messages per DM. Client-side is a fast, non-blocking precheck (`useMessages.ts`'s `commitMessage`); `firestore.rules` is the actual enforcement. Resets automatically when the other participant replies. Permanent users are exempt. |
| Reported message moderation | ✅ Built | `/admin/reports` — see the Moderation section above. No admin-management UI (console-only) and no backfill for reports made before `isReported` existed. |
| Session inactivity auto-logout | ✅ Built | Signs out after 5 min of no activity by default; remote-configurable via `config/featureFlags.inactivityLogoutMinutes` (Firebase Console, no redeploy — `<= 0` disables it). See `AGENTS.md`'s Session Inactivity Auto-Logout section. Never wipes an anonymous user's data — only the explicit "Leave & delete" button does that. |
| Spam rate limiting | Not built | Global write-rate limits (e.g. max N messages/minute) via Cloud Function or Firestore rules. |
| CSAM detection | Not built | Integrate Google Cloud Vision SafeSearch API on image upload Cloud Function. |
| Ad slots | Placeholder only | Replace `<AdSlot>` components with real Google AdSense `<ins>` tags once approved. |
| CDN for images | Firebase Storage | Images served directly from Storage. Consider Cloud CDN for better performance at scale. |

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_FIREBASE_DATABASE_URL` | ✅ | RTDB URL — required for presence & typing indicators |
| `VITE_TENOR_API_KEY` | ✅ | Tenor GIF search (free tier: 10 req/s) |

---

## Troubleshooting

**"Missing or insufficient permissions" in console**  
→ Firebase rules not deployed yet. Run `firebase deploy --only firestore,database,storage`

**Users don't go offline when closing the tab**  
→ RTDB `onDisconnect()` requires the `VITE_FIREBASE_DATABASE_URL` to be set. Check `.env.local` and verify the RTDB service is enabled in Firebase Console.

**Typing indicator not updating**  
→ Check RTDB URL in `.env.local`. Open Firebase Console → Realtime Database → verify `/typing` nodes appear when typing.

**Google sign-in popup blocked**  
→ Add your domain to Firebase Console → Authentication → Settings → Authorized domains.

**GIFs not loading**  
→ Tenor API key missing or invalid. Check `VITE_TENOR_API_KEY`. Test: `curl "https://tenor.googleapis.com/v2/search?q=hello&key=YOUR_KEY&limit=1"`

**Images not uploading**  
→ Check Storage rules are deployed. Check browser console for CORS errors. Firebase Storage has CORS configured by default for web — no extra setup needed.

**Wrong Node version**  
→ Run `nvm use` in the project root. `package.json`'s `engines` field requires `>=20.9.0`; `.nvmrc` pins `26` for local dev consistency (`nvm install 26` if missing).

**Anonymous user input stays locked after other user replies**  
→ The DM doc is subscribed via `onSnapshot` — the unlock is real-time. If it doesn't unlock, check that `consecutiveSenderCount` reset correctly in Firestore Console → `dms/{dmId}` document. If the field is missing on old DM docs, run a one-time migration or manually set `lastSenderId: ""` and `consecutiveSenderCount: 0`.
