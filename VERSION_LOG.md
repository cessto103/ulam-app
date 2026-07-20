# uLam — Version Log

Last updated: 2026-07-20 · **v1.38.0**

---

## Runtime Environment

| Tool | Version |
|------|---------|
| Windows | 11 Pro (10.0.26200) |
| Node.js | v24.14.1 |
| npm | 11.4.1 |
| PHP | 8.2.18 |
| Composer | 2.7.9 |
| MySQL | via WAMP64 |

---

## Mobile App (`uLam-app` — Expo)

### Core

| Package | package.json spec | Installed |
|---------|-------------------|-----------|
| expo | ~54.0.0 | 54.0.35 |
| expo-router | ~6.0.24 | 6.0.24 |
| expo-modules-core | (transitive) | 3.0.30 |
| react | 19.1.0 | 19.1.0 |
| react-native | 0.81.5 | 0.81.5 |

### Expo Packages

| Package | package.json spec | Installed |
|---------|-------------------|-----------|
| expo-constants | ~18.0.13 | 18.0.13 |
| expo-font | ~14.0.12 | 14.0.12 |
| expo-image-picker | ~17.0.11 | 17.0.11 |
| expo-linking | ~8.0.12 | 8.0.12 |
| expo-splash-screen | ~31.0.13 | 31.0.13 |
| expo-web-browser | ~15.0.11 | 15.0.11 |
| expo-secure-store | ~15.0.8 | 15.0.8 |
| expo-status-bar | ~3.0.9 | 3.0.9 |
| expo-haptics | ~15.0.7 | 15.0.7 (press/reaction feedback, v1.10.0) |
| expo-location | ~19.0.8 | 19.0.8 (Settings GPS location pin + reverse geocoding, v1.14.0 — was already installed for store listing) |

### UI & Styling

| Package | package.json spec | Installed |
|---------|-------------------|-----------|
| nativewind | ^4.0.1 | 4.2.5 |
| tailwindcss | ^3.4.17 | 3.4.19 |
| react-native-reanimated | ~4.1.1 | 4.1.7 |
| react-native-gesture-handler | ~2.28.0 | 2.28.0 |
| react-native-worklets | 0.5.1 | 0.5.1 (pinned; SDK 54-compatible peer of reanimated 4.1) |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 (shopping-list persistence) |
| react-native-screens | ~4.16.0 | 4.16.0 |
| react-native-safe-area-context | ~5.6.0 | 5.6.2 |
| react-native-gifted-charts | ^1.4.77 | 1.4.77 (My Insights dashboard graphs, v1.14.0 — SVG-based, no new native linking) |
| react-native-webview | 13.15.0 | 13.15.0 (Leaflet/OSM nearby map, v1.20.0 — bundled with Expo Go, no API keys) |

### Data & Networking

| Package | package.json spec | Installed |
|---------|-------------------|-----------|
| @tanstack/react-query | ^5.101.0 | 5.101.0 |
| axios | ^1.18.0 | 1.18.0 |

### Dev Dependencies

| Package | package.json spec | Installed |
|---------|-------------------|-----------|
| @types/react | ~19.1.10 | 19.1.10 |
| typescript | ~5.9.2 | 5.9.2 |
| eas-cli | ^21.0.2 | 21.0.2 (bumped 2026-07-20 from 20.5.1 to clear `npm audit`-flagged transitive vulns in its bundled deps -- xmldom, node-forge, tar, js-yaml; all were devDependency-only, never shipped in the app bundle. EAS builds live: project `ulam`, package com.ulam.app, preview APK profile) |
| sharp | (latest) | image asset compression script use (header photo slimming, v1.20.0) |

---

## Laravel API (`uLam` — Laravel)

### Core

| Package | composer.json spec | Installed |
|---------|--------------------|-----------|
| PHP | ^8.2 | 8.2.18 |
| laravel/framework | ^12.0 | v12.62.0 |
| laravel/sanctum | ^4.0 | v4.3.2 |
| laravel/tinker | ^2.10.1 | — |

### Features

| Package | composer.json spec | Installed |
|---------|--------------------|-----------|
| anthropic-ai/sdk | ^0.30.0 | v0.30.0 |
| resend/resend-laravel | ^1.4 | v1.4.0 |
| inertiajs/inertia-laravel | ^2.0 | v2.0.24 |
| tightenco/ziggy | ^2.0 | — |

---

## Key Version Decisions

| Decision | Reason |
|----------|--------|
| `expo-image-picker ~17.0.11` | SDK 54 (`expo@54.0.35`) requires `~17.0.11` per `bundledNativeModules.json`. v15 and v56 both cause `createPermissionHook is not a function` crash. |
| `npm install --legacy-peer-deps` | Required for all installs — React 19 peer-dep conflicts with several packages that still declare `react@^18`. |
| `nativewind ^4.x` + `tailwindcss ^3.x` | NativeWind v4 requires Tailwind v3 (not v4). Tailwind v4 drops the `tailwind.config.js` format that NativeWind v4 depends on. |
| `react-native 0.81.5` | Pinned by Expo SDK 54. Do not upgrade independently. |
| `laravel/framework ^12.0` | Laravel 12 (not 13) — `laravel new` scaffolded v12 at project creation time. |
| `anthropic-ai/sdk ^0.30.0` | Used for AI meal plan generation via `MealPlanService`. |
| `postcss <8.5.10` (npm audit moderate) left unfixed | Only resolvable by bumping `expo` to 57.0.7, a major SDK jump past the pinned 54 line above. postcss here is a build-time CSS processor (via `@expo/metro-config` and `tailwindcss`), not code that ships in the runtime bundle, so the actual exposure is minimal; not worth the SDK-upgrade risk right now. |

---

## Version History

### 2026-07-20 · v1.30.2–v1.37.0 — Post-launch polish, Connections, shared shopping lists, a security/perf audit, and a full gamification rebuild

**v1.37.0 / v1.36.0 — Reward Tiers**
- New feature: admin-defined Reward Tiers (paired uLam Phases 1–4 + admin v1.24.0) now actually grant something instead of being scaffolding — Premium days (extend-only, never shortens an active subscription), a recipe or store boost credit (banked until spent free through the existing Boost sheet, no GCash reference needed), or a cosmetic badge — once a user completes every required Task (AND-gated, not any-of) and/or crosses an XP threshold. Surfaces on Awards (new "Rewards" section), your own Profile (badge chip row), and other users' public profiles (badge pills, via the now-extended `GET /users/{id}`). 6 starter tiers seeded on top of the existing Tasks catalog.

**v1.35.0 — Unified Tasks/Awards revamp**
- Achievements (previously seeder-only, no admin UI, and silently broken — "Recipe Collector" could never actually be earned) merged into Daily/Weekly Tasks into one admin-manageable "Tasks" system (admin v1.23.0). New Monthly frequency; lifetime tasks can now be tiered Bronze/Silver/Gold/Diamond sharing a tier group, rendered as one progressive badge via the new `TierProgressCard`. Saving a recipe now actually earns XP (previously a silent no-op with 24-save test accounts to prove it).

**v1.34.0 — Gender field**
- Optional Male/Female field in onboarding + Settings > My Account, entirely skippable; powers a gendered "Mr./Ms. Palengke" Awards badge for the shared-shopping-list helper flow. Unset users see a neutral fallback title.

**v1.33.x — Budget custom expenses, security/perf audit, XP staleness fix**
- Daily fare/allowance replaced with a repeatable custom-expenses list (Travel/Load/Baon/Others categories); Today-duration budgets now correctly deduct them too (v1.33.1 fixed a leftover today-only exemption carried over from the old fields).
- Full project security + performance audit: fixed an open-redirect via notification tap-routing (a server-controlled `action_url` could reach `Linking.openURL` completely unguarded — new `safeAppUrl.ts` gate); bridged `AppState` to React Query's `focusManager` so background polling (unread-count, shared-list) actually pauses, which it never did on native; swapped core `Image` usage to `expo-image` on the highest-traffic screens; added session-expiry handling now that Sanctum tokens actually expire (paired uLam commit); debounced two search inputs that were minting a fresh query on every keystroke.
- XP bar on Profile/Awards now updates instantly instead of requiring a manual pull-to-refresh (shared account state was never told to refresh after an XP-earning action); recipe bookmark double-tap race fixed — button now disables itself while a save is in flight, matching the share button beside it.

**v1.32.x — Shared shopping lists**
- Shopping list moved from device-local storage to the server: shareable with Connections, live 15s polling while a shared list is open, per-item added-by/checked-by attribution, event lists that complete without touching the budget. Push notification taps now route straight to their `action_url`. Home's 4th tile renamed My Recipe Book → My Shopping List.

**v1.31.0 — Connections**
- New mutual-connection system, distinct from the existing one-way Follows: request/accept/decline with a badge count, private relationship-label chips (admin-managed list), a Connect button on profiles.

**v1.30.2–v1.30.14 — Post-v1.30.1 polish batch**
- Terracotta-themed several remaining native-style headers; fixed the Boost sheet, cover-photo picker, and meal-plan modal sitting behind the Android nav bar — eventually solved app-wide with a persistent `AndroidNavBarFiller` once it turned out `NavigationBar.setBackgroundColorAsync` is a documented no-op under this app's edge-to-edge setup; several rounds of keyboard-avoidance fixes on comment/report fields (height→padding mode, explicit scroll-snap on show/hide).
- Pull-to-refresh spinner fixed on Android app-wide — 23 `RefreshControl` instances across 22 files were missing the Android-specific `colors` prop (only had the iOS-only `tintColor`).
- Added an email verification screen (OTP, gated ahead of onboarding); account state now auto-refreshes on app foreground and on the Meal Plan tab gaining focus, so an admin-side change (e.g. granting Premium) no longer needs a re-login to show up.
- Replaced free-text location entry (onboarding + Location settings) with cascading region → city → barangay selects backed by a bundled PSGC dataset (~1,600 cities/municipalities, ~42,000 barangays) — fixed a real duplicate-key crash along the way from city names that repeat across provinces (e.g. "Burgos" ×4 in Region I alone). Report a Price now requires a specific market/store instead of a generic city/municipality field.

### 2026-07-17 · v1.28.1–v1.30.1 — Gamification, celebrations, and a large UX/perf pass

**v1.30.x — Daily/weekly tasks + UI batch**
- Daily & Weekly Tasks checklist on the Awards screen — auto-completes (and awards bonus XP) when the matching real action happens (meal plan / price report / post / spending log); backed by the previously dormant `daily_tasks`/`user_daily_tasks` tables, now fully wired via `XpService::checkDailyTasks()`
- New admin "Gamification" section: Daily & Weekly Tasks manager (emoji picker, action-type dropdown limited to real XP-earning actions) and Reward Tiers manager (XP milestones — scaffolding only, no redemption yet); admin v1.20.0
- "Saved" tab removed from Awards (duplicated My Recipe Book) — now Profile > Saved Recipes
- My Insights / Seller Subscription / My Store headers themed to the terracotta gradient; community post images tappable to full-screen; community filter chips now horizontally scrollable

**v1.29.x — Level-up celebration**
- New full-screen SVG confetti burst on level-up (`ConfettiBurst`, native-thread transform/opacity animation only); RewardCelebration now renders above all sibling content
- Recipes tab + Community feed perf: extracted memoized `RecipeCard`/`PostCard` (inline render closures were rebuilding every visible card on any interaction); bookmark save is now optimistic; fixed 3 recipes carrying the stale `budget_400plus` tag (admin editor/API/seeder all still offered the old 4-tier scheme — now the full 7-tier one; admin v1.19.1)

**v1.28.x — Status bar + collapsing headers + regional fix**
- Status bar/Android nav icons pinned dark app-wide (was following system dark mode); light override only on the recipe photo hero — needs a fresh native build to take effect
- Community/Prices collapsing headers: pinned logo row, threshold-snap collapse (fixes jitter/lag/disappearing-header regressions found along the way)
- Report a Price: municipality picker now region-aware from `/markets` (was a hardcoded Metro Manila list); safe-area fixes across Log Spending, onboarding, meal-plan sheet, Report a Price
- Onboarding budget field no longer closes the keyboard per keystroke (steps were being remounted every render)

### 2026-06-24 · v1.3.0 — Community, Ratings, Voting, Profile, UI fixes

**Backend**
- `recipe_ratings` migration + `RecipeRating` model — stores 1–5 star ratings per user per recipe; `average_rating` + `ratings_count` denormalized on `recipes` table for N+1-free queries
- `RecipeController::rate()` — `POST /recipes/{id}/rate` · upserts rating, recomputes avg
- `RecipeController::show()` — now returns `my_rating` for the requesting user
- `CommunityController::update()` — `PATCH /community/post/{id}` · 72-hour edit window enforced server-side
- `CommentController::update()` — `PATCH /community/comment/{id}` · same 72-hour rule
- `DatabaseSeeder::seedRecipes()` — changed `firstOrCreate` → `updateOrCreate` so re-seeding refreshes `steps`, `tips`, `difficulty`, etc. on existing records; ingredients are re-synced (delete + re-insert) each run

**Frontend**
- `post/[id].tsx` — full rewrite: Android nav-bar overlap fixed via `useSafeAreaInsets` (input bar now has `paddingBottom: insets.bottom`); edit-post inline (pencil icon in header, only for author, only within 72h); edit-comment inline (yellow banner, same rule); reply-to banner (shows "@Name", prefills mention); delete post + delete comment; `KeyboardAvoidingView` correctly handles both platforms
- `recipe/[id].tsx` — star rating row (5 tappable ★ below the info strip); shows author's own rating, global average, total count
- `presyo.tsx` — 👍/👎 vote buttons on community-sourced entries; optimistic state, reverts on error
- `meal-plan.tsx` — "📚 Opisyal / 👥 Komunidad" source toggle in Recipes tab; Komunidad view fetches `recipe_share` posts from community feed, each card links to full post detail
- `app/(tabs)/index.tsx` — avatar button in home header now navigates to `/(tabs)/profile` (the full profile screen) instead of the edit-profile modal
- `app.json` — version bumped `1.0.0` → `1.3.0`; splash screen config added (`backgroundColor: #1E6E47`, `resizeMode: contain`)

**App icon**
- `scripts/generate-icons.js` — Node.js script using `sharp` to render SVG icons to PNG; generates `icon.png`, `splash-icon.png`, `android-icon-foreground.png`, `android-icon-background.png`
- Run: `npm install --save-dev sharp && node scripts/generate-icons.js`

### 2026-06-24 · Brand Identity — Sariwa palette + Baloo 2 / Nunito Sans

**Colors (Sariwa — Fresh Market)**
- Replaced all old teal values (`#0F6E56`, `#1D9E75`, `#085041`, etc.) with Sariwa palette across all 17 screen files via global find-replace
- `tailwind.config.js` — full teal scale overridden with Sariwa shades (teal-600 = `#1E6E47`, teal-400 = `#3A9B6F`, etc.)
- Added `accent` token (`#F5A623` gold) and `muted` token (`#6B8F7A`)
- Streak accent: `#E05C2A` added as `streak` token

**Typography**
- `@expo-google-fonts/baloo-2` + `@expo-google-fonts/nunito-sans` installed
- Fonts loaded via `useFonts` in `_layout.tsx` with `SplashScreen.preventAutoHideAsync()` guard
- `tailwind.config.js` — `fontFamily` tokens: `font-display` (Baloo2_700Bold), `font-display-xb` (800), `font-body` (Nunito Regular), `font-body-semi`, `font-body-bold`
- Applied Baloo 2 to: wordmark (welcome + login screens), greeting + budget amount on home, section stats (streak/savings/level), pricing cards in upgrade screen, all modal header titles via `HEADER_TITLE_STYLE`
- Applied Nunito Sans to: tagline, hero copy, button labels, captions on welcome/login/register screens

**Tab bar**
- Tab bar border updated to Sariwa teal-100 (`#D4EDDD`)
- Tab labels: `NunitoSans_600SemiBold`
- Header titles: `Baloo2_600SemiBold` via shared `HEADER_TITLE_STYLE` constant

### 2026-06-24 · Recipe Seed Expansion (v1.2.0): Recipes #82–100

**19 new recipes added to `DatabaseSeeder::seedRecipes()`**
- Categories covered: gulay (2), pancit, sabaw (2), almusal, isda (2), karne, baboy (4), meryenda (2), dessert (2)
- Budget distribution: `budget_100` ×4, `budget_200` ×11, `budget_400` ×2, `budget_400plus` ×1, `budget_400` ×1
- New recipes: Ginisang Patola, Batchoy, Tinolang Hipon, Ginisang Gulay na Halo-Halo, Chicken Adobo Flakes, Sarciadong Isda, Kilawing Kambing, Pork Ribs BBQ, Laing, Pork Estofado, Monggo at Chicharon, Inihaw na Pusit (Simple), Ukoy, Nilupak, Pork BBQ Skewers, Ginataang Bilo-Bilo, Pork and Mushroom Adobo, Chicken Afritada Espesyal
- Each recipe includes `category`, `image_url` (Unsplash), `difficulty` fields (migration added in prior session)
- `DatabaseSeeder.php` uses `firstOrCreate(['title' => $r['title']])` — re-running seed is safe

### 2026-06-24 · Phases 13-15 (v1.2.0): Comments + GCash Payment + Price History

**Phase 13 — Post Comments**
- `CommentController` (new): `index()` paginated 20, eager-loads user + replies; `store()` validates 1-1000 chars, increments `comments_count`, notifies post owner; `destroy()` own-comment-only with decrement
- `CommunityController::show()` (new): `GET /community/post/{id}` returns single post with user, images, counts
- `CommunityController::feed()` — added `?following=1` filter for followed-only posts
- `app/post/[id].tsx` (new) — full post detail + threaded comments: FlatList with post card header, reply nesting, optimistic puso toggle, sticky comment input bar (KeyboardAvoidingView), delete with confirm Alert
- `komunidad.tsx` — 💬 count is now tappable → `/post/{id}`
- `user/[id].tsx` — 💬 count on post cards → `/post/{id}`
- `_layout.tsx` — registered `post/[id]` (headerShown: false)

**Phase 14 — PayMongo GCash Checkout**
- `UpgradeController` (new): `checkout()` calls PayMongo `POST /v1/links` → returns `{ checkout_url, payment_link_id }`; `webhook()` verifies HMAC-SHA256 `paymongo-signature`, on `link.payment.paid` sets `plan='premium'` + `premium_expires_at`
- `config/services.php` — added `webhook_secret` to paymongo array
- `.env` — added `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET` placeholders
- `expo-web-browser` installed (SDK 54 compatible, `npx expo install`)
- `upgrade.tsx` — CTA buttons now call `POST /upgrade/checkout`, open `checkout_url` with `WebBrowser.openBrowserAsync()`, then `refreshUser()` on close to pick up premium status
- Routes: `POST /upgrade/checkout` (auth), `POST /upgrade/webhook` (public, before auth middleware)

**Phase 15 — Price History Chart**
- `PriceController::history()` (new): `GET /prices/history/{item}` — aggregates `CommunityPriceReport` by day (avg, min, max, count), scoped to user's municipality/province, last 30 days, also returns 15 most recent individual reports
- `app/price-history/[item].tsx` (new) — summary stats row (current/min/max/total reports), custom View-based bar chart (no library), recent reports list, trend indicator (↑/↓) in header
- `presyo.tsx` — search results: "📈 Kasaysayan" button beside "I-report" CTA; quick-pick list: 📈 icon per item → `/price-history/{item}`
- `_layout.tsx` — registered `price-history/[item]` (headerShown: false)

### 2026-06-30 · Phase 12 (v1.1.1): Follow System + Public Profiles + Premium Upgrade
- **Follow system** — one-way follow using existing `connections` table (`status='connected'` immediately)
- **`ConnectionController`** (new): `follow`, `unfollow`, `profile`, `followers`, `following` endpoints
- **`GET /users/{id}`** — public profile with follower/following counts + `is_following` flag + their posts
- **`POST/DELETE /users/{id}/follow`** — fires push notification to followed user
- **`CommunityController::feed()`** — added `?following=1` filter for followed-only posts
- **`komunidad.tsx`** — "🌍 Lahat | 👥 Sinusundan" mode switcher; post avatars/names are tappable → user profile
- **`app/user/[id].tsx`** (new) — public user profile: bio, follow stats, follow/unfollow button, post history
- **`app/connections.tsx`** (new) — "Sinusundan ko | Mga Sumusunod" two-tab screen with inline unfollow
- **`app/upgrade.tsx`** (new) — Premium screen: teal hero, ₱59/buwan or ₱499/taon pricing, feature list, GCash CTA placeholder
- **`awards.tsx`** — plan row → tappable `/upgrade`; profile card buttons split to edit + connections
- **`_layout.tsx`** — registered `user/[id]`, `connections`, `upgrade`

### 2026-06-30 · Phase 11: Recipe Book + Stats
- `awards.tsx` rewritten: 2-tab switcher ("🏆 Gantimpala" | "📖 Naka-save") below the profile card
- Profile card redesigned: 4 pill badges (Level / Free / Streak / Badges count) replace the flat stats row; "I-edit ang Profile" shortcut button added
- **Gantimpala tab** — new Stats card fetched from `GET /user/stats` showing ₱ natipid / Meal Plans / Mga Post / Achievements in a 2×2 grid; achievements list + leaderboard unchanged
- **Naka-save tab** — fetches `GET /recipe-book`, shows saved recipe cards with budget badge + cost + servings + time; 🔖 tap to unsave (calls `POST /recipes/{id}/save` toggle); load-more pagination; empty state with browse CTA
- All queries use React Query with stale times to avoid redundant fetches

## v1.1.0 — 2026-06-29

### 2026-06-29 · Phase 10: Push Notifications + Notifications Screen
- `expo-notifications@0.32.17` + `expo-device@8.0.10` installed (SDK 54 compatible)
- Migration `2026_06_28_000001` — adds `push_token` column to users
- `UserNotification` model → maps to existing `notifications` table with `type`, `title`, `body`, `data`, `action_url`, `read_at`
- `NotificationService` — `send()` creates DB record + sends Expo push (fire-and-forget, failures logged); `sendBulk()` for batch daily reminders
- `NotificationController` — `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /notifications/{id}/read`, `POST /user/push-token`
- `SendDailyReminders` artisan command — queries users with push_token who haven't logged spending today, bulk-pushes + batch-inserts DB records; scheduled at 08:00 via `routes/console.php`
- `CommunityController::react()` — notifies post owner on puso (skips self-reactions)
- `XpService::checkAchievements()` — notifies user when achievement unlocks
- `usePushNotifications` hook — requests permission, registers Expo token with backend on first login; called from RouteGuard
- `Notifications.setNotificationHandler` in `_layout.tsx` — shows alert + sound in foreground
- `app/notifications.tsx` — pull-to-refresh FlatList, grouped Today/Kahapon/Nakaraan labels, unread dot + teal bg tint, tap marks read + navigates to `action_url`, "Basahin lahat" header action
- Home screen header — bell icon with red unread count badge (polls every 60s), avatar initials beside it

### 2026-06-28
- **Phase 9:** Onboarding wizard for new users
- Migration `2026_06_27_000001` — adds `onboarding_completed boolean default false`; existing users backfilled to `true` so they bypass onboarding
- `User.php` — `onboarding_completed` added to `$fillable` + cast as boolean
- `AuthController::formatUser()` + `UserController::me()` — both now return `onboarding_completed`
- `UserController::update()` — accepts `onboarding_completed` via PATCH `/user/profile`
- `auth.ts User` type — `onboarding_completed: boolean` added
- `onboarding.tsx` — 4-step wizard: Location (city autocomplete from 15 PH cities) → Household size (stepper) → Budget (4 quick-pick presets + custom input, shows per-day/per-person breakdown) → Done (summary card)
  - "Laktawan" skip link marks onboarding_completed without budget setup
  - Step 3 calls `POST /budget/setup` then `PATCH /user/profile` atomically
  - Step 4 shows a teal summary card and routes to dashboard
- Route guard updated: new users (`onboarding_completed = false`) are redirected to `/onboarding` instead of tabs; `gestureEnabled: false` prevents swipe-back

### 2026-06-27
- **Phase 8:** Spending log + streak tracking + profile edit
- `UpdateStreak` middleware — auto-increments `streak_days` on first API call each day, resets if gap > 1 day, registered on all authenticated API routes
- `BudgetController::current()` — now returns `has_logged_today` boolean
- `BudgetController::log()` — awards +10 XP on first log of the day (skips re-logs), returns `xp_earned`, `remaining`, `saved`
- `log-spending.tsx` — 5-category breakdown input (Almusal/Tanghalian/Meryenda/Hapunan/Iba pa), auto-sum total, note field, success screen with XP badge
- `edit-profile.tsx` — name, username, bio, household size stepper (1–20), municipality, barangay, dietary preference chips (6 options); calls `refreshUser()` on save
- Home screen redesigned: avatar initials → opens edit-profile, "Mag-log" button inline in budget card, `has_logged_today` live status, tappable daily tasks with strikethrough on completion, streak stats row includes Level chip

### 2026-06-26
- **Phase 7:** Recipe browser live — 10 seed recipes (₱100/₱200/₱400/₱400+ tiers), 66 ingredients
- Meal Plan tab redesigned as 2-in-1: "Plan Ngayon" + "Mga Recipe" tab switcher
- Recipe list: budget filter chips, search, save/unsave inline, tap to open detail
- `recipe/[id].tsx` detail screen: teal hero banner, info strip (cost/servings/time), numbered steps, tips card, save toggle button
- `RecipeController::index()` now includes `is_saved` via correlated subquery (no N+1)
- `recipe/[id]` registered in `_layout.tsx` with no header (custom back button in screen)

### 2026-06-25
- **Phase 6:** XP + Achievements system live — `XpService`, real awards screen, XP progress bar, leaderboard
- `XpService` created — awards XP, auto-levels up, checks achievement conditions on every action
- XP wired: create_post (+30), report_price (+15), generate_meal_plan (+20)
- `UserController::achievements()` now returns all achievements with `is_earned` + `earned_at`
- `UserController::leaderboard()` replaced `LeaderboardCache` with direct XP-ranked user query
- `awards.tsx` fully live — real XP bar, real achievement list (locked/unlocked), real leaderboard with medal emoji, "Ikaw" highlight
- Version tag (`v1.0.0` from `Constants.expoConfig.version`) added to welcome + login screens

### 2026-06-24
- **Phase 5:** Community feed live — real API, puso reactions, filter tabs, create-post modal
- **Phase 3 (price):** 72 market prices seeded (Cogeo wet market + SM/Robinsons Antipolo)
- `report-price` modal screen added; Presyo tab wired to report API
- Budget setup: duration selector (Ngayon / 7 / 15 / 30 araw / Custom), dynamic labels
- Dashboard: savings label + period label now reflect actual `total_days` from API
- `User::currentBudget` accessor added (alias for `activeBudget()`)
- `BudgetController::setup()` date logic: dynamic start/end based on `total_days`
- `SeedRecipes` Artisan command (`php artisan ulam:seed-recipes`) built; awaiting Anthropic credits

### 2026-06-23
- `expo-image-picker` upgraded `~15.0.7` → `~17.0.11` (SDK 54 compatibility fix)

### 2026-06-22
- `expo-image-picker` downgraded `^56.0.18` → `~15.0.7` (wrong; SDK mismatch)
- Added `expo-secure-store ~15.0.8` (language + auth token persistence)
- Added `@tanstack/react-query ^5.101.0`, `axios ^1.18.0`
- Added `nativewind ^4.0.1`, `tailwindcss ^3.4.17`
- Added `anthropic-ai/sdk ^0.30.0` to Laravel backend
- Initial project scaffolding: Expo SDK 54 + Laravel 12 + Sanctum
