# uLam App — Changelog

All notable changes to this project are documented here.
Format: `## [version] — YYYY-MM-DD` · sections: Added, Changed, Fixed, Removed.

---

## [1.17.0] — 2026-07-14

Nearby Palengke Locator, Phase 1 (list-based — the interactive map comes with the dev-build phase).

### Added
- **Get Directions button** on store and market pages — opens turn-by-turn navigation to the exact coordinates in Google Maps (app or browser, no API key needed).
- **Search radius selector** on the Prices tab — after "find near me," choose 3 / 5 / 10 / 15 km; results re-query live.
- **Distance badges** on nearby market/store cards (meters under 1 km, e.g. "580 m").
- **Source badges** — markets auto-discovered from OpenStreetMap are labeled "From OpenStreetMap" (on cards and the market page); verified uLam stores show "Verified on uLam."
- **Wider OpenStreetMap discovery** — now also finds convenience stores, plus supermarkets/groceries mapped as building outlines (previously only point-mapped ones were found).

### Changed
- Markets now carry a `source` field (`ulam` vs `osm`) so app and admin can tell registered listings from auto-discovered ones.

## [1.16.0] — 2026-07-13

App-wide readability pass for older users, plus the photo-header redesign.

### Changed
- **Readability audit across every screen (51 files)** — no text below 12px anywhere (213 font-size bumps from 9–11px); all `ink-faint` (#B0A18C) text darkened to `ink-soft` (#6F655A) for real contrast (226 instances); faint semi-transparent white text on colored headers bumped to 90% opacity; tab bar inactive labels/icons darkened; row chevrons on Profile/Settings darkened and enlarged; notification count badge enlarged (14px → 18px bubble). The only sub-12px text left is inside fixed-size mini-badges, which grew along with their text.
- **Profile & Awards headers redesigned** — Filipino food photo background with a terracotta gradient overlay (solid at top, food showing through toward the curved bottom), uLam logo + gear/back aligned in a header row, larger name/username with text shadows.
- **Animated "fire" XP bar** (shared component) on both Profile and Awards headers — white→gold→red gradient with a solid cream border, fills on load and gently glows.
- **Your Stats boxes (Awards)** — strong solid palette colors (gold/leaf/terracotta/olive) with large icons.
- **Saved tab (Awards)** — icon-only actions replaced with labeled "Add to Meal Plan" and "Remove" (trash icon) buttons.
- **Filipino palette enforced** — remaining Tailwind default ambers/reds on Awards mapped to palette gold and the app's own red.

### Fixed
- Profile tab was the only tab still showing the navigator's default header, doubling the uLam logo — hidden, header now handles its own safe-area.
- Settings and My Insights screens showed a doubled back-arrow/title bar (never registered in the root stack with `headerShown: false`).

## [1.15.0] — 2026-07-13

View counts on posts and recipes.

### Added
- **View counts** — recipe cards, the recipe detail page, community post cards, and the post detail page now show an eye icon with a formatted view count (e.g. "1,531"), built on the `content_views` tracking added in v1.14.0.

### Fixed
- Cleared a stale Metro bundler cache issue after installing `react-native-gifted-charts` that was blocking Android bundling (`Unable to resolve "./BarChart"`) — the package files were intact; Metro's cache just needed a rebuild.

## [1.14.0] — 2026-07-13

Settings screen, secondary email verification, boosters, store ratings/comments, and a new "My Insights" dashboard.

### Added
- **Settings screen** — new gear icon on Profile opens a dedicated Settings screen (Language toggle, Location, Secondary Email, Help & Support, Logout), split out from Edit Profile so public-profile editing and account/security settings aren't mixed together.
- **Secondary email with OTP verification** — add a second email address, verified via a 6-digit code sent by email (not a clickable link, to avoid the mail-client-switch problem on mobile) before it's considered confirmed.
- **Location editing** — municipality, barangay, province, and region are now all editable in one place (Settings), plus a "use my current location" GPS button that reverse-geocodes and auto-saves in one tap.
- **Recipe & store boosters** — sellers can boost a recipe (ranking priority in listings) or a store (ranking priority + widened 15km search radius) via manual GCash payment, reviewed by an admin. Boosted items show a "Boosted" badge.
- **Store ratings & comments** — stores can now be rated 1–5 stars and commented on, mirroring the existing recipe rating and post comment features.
- **View tracking** — recipe, post, and store detail pages now log views (deduped per user per day, self-views excluded), feeding the new insights dashboard.
- **"My Insights" dashboard** — new screen off Profile with subscription status, active/past boosts (views before vs. during), and five trend graphs (posts, post views, recipes, recipe views, store popularity) each switchable between daily/weekly/monthly/yearly.

### Changed
- Profile's avatar edit badge is now an outlined pencil icon instead of an emoji.
- Edit Profile no longer edits location fields — moved entirely to Settings to avoid the same data being editable in two places.
- Profile's Help & Support row and Logout button moved into the new Settings screen; Profile itself is back to being a clean, scannable hub.

### Fixed
- `GET /user` was returning a stripped-down set of fields, silently blanking bio/barangay/dietary preferences in Edit Profile on every load — now returns the full profile.

## [1.13.0] — 2026-07-13

Recipe sharing now sends a real share card, not just a bare photo.

### Fixed
- **Shared recipes only carried the photo — title, cost, servings, and description were missing.** The v1.12.0 fix solved the "no image at all" bug, but Android's share intent still can't carry caption text alongside an attached image (a real OS-level limitation, not something an app can work around by asking nicer). Rather than depend on the OS to pass text through, the recipe's info is now rendered directly onto the shared image itself — a proper branded share card (cover photo + gradient + title + cost pill + servings + uLam wordmark), captured with `react-native-view-shot` right before sharing. The content can no longer be dropped by either platform because it's part of the picture, not separate metadata. Added `react-native-view-shot` (confirmed bundled with Expo Go — no custom dev client needed).

## [1.12.0] — 2026-07-13

Recipe photo sharing actually attaches now, and pull-to-refresh everywhere.

### Fixed
- **Social share was text-only — the recipe photo never attached.** React Native's core `Share` API can't carry an image on Android at all, and its `url` field (which does work on iOS) was never being used. Now downloads the recipe's cover photo locally first: iOS uses `Share.share({ url, message })` to send photo + caption together; Android uses `expo-sharing`'s native image-share intent (the caption isn't pre-filled there — the target app's own composer is where that's added, standard for photo-first shares on Android). Added `expo-file-system` and `expo-sharing`.

### Added
- **Pull-to-refresh** added to every real data screen that was missing it: Recipe Book, Market (tab + detail), Store detail, My Stores, My Price Reports, Spending History, Price History, Help & Support, Seller Subscription, Support Ticket thread, Shopping List, and Profile. (Search was deliberately skipped — it's a live-typing/debounced screen with no cached list to refresh, so pull-to-refresh doesn't map onto its interaction model.)

### Changed
- Profile's top plan badge now also prioritizes the seller plan (matches the Awards & Achievements header) — it was only wired into the "Seller Subscription" row below, not the badge under the photo, so "Free Plan" kept showing there even with an active seller subscription.

## [1.11.0] — 2026-07-13

Recipe sharing, meal-plan-add fix in the Bookmark tab, and profile/header follow-ups.

### Added
- **Share to Social Media** — recipe detail screen now has a share icon (header, next to Edit/Report) that opens the native OS share sheet (Facebook, Instagram, TikTok, Messenger, etc — whatever's installed) with the recipe's title, cost, servings, and description. Available on every recipe regardless of who owns it — this is separate from the existing in-app "share to your followers" repost feature.
- **"Add to Meal Plan" in the Bookmark tab** — Awards & Achievements' Saved Recipes list only had a bookmark/unsave button; it now has its own add-to-meal-plan action (meal-type picker sheet, same flow as the recipe detail screen), since the capability was simply missing there before, not broken.

### Changed
- Renamed "Add to Plan" → "Add to Meal Plan" on the recipe detail screen's action button for consistency with the modal that opens.

## [1.10.0] — 2026-07-13

Motion pass: press feedback, reaction bursts, and an XP/level-up/achievement celebration, plus profile and Awards & Achievements fixes.

### Added
- **`AnimatedPressable`** — shared spring scale-down + haptic press feedback, replacing plain `Pressable` on the center "+" tab, `AddButton`, and tab bar icons (which now pop on focus).
- **`HeartReactButton`** — Komunidad heart reaction bursts on like (not on unlike), with haptic.
- **Thumbs up/down + star rating animations** — recipe vote buttons, the post detail page's thumbs, and the recipe star rating now pop instead of just swapping color/opacity.
- **`RewardCelebration`** — XP count-up → level-up burst → achievement-unlocked card sequence, haptic-timed. Wired into the Log Spending and Report a Price success screens.
- **Daily Tasks row pop** — a task's XP pill pops with a success haptic the instant it's completed, not just on next render.
- **Seller plan visibility** — Profile now shows your actual seller subscription (e.g. "✓ Suki Seller") on its own row; Awards & Achievements' header badge shows the seller plan when active instead of always showing the unrelated consumer Free/Premium status.
- Achievements are now bilingual (`title_en`/`description_en`, English shown when the app is set to English) instead of Tagalog-only.

### Changed
- Awards & Achievements header: gold accents (low contrast against the terracotta background) replaced with white/leaf-green; Edit and Connections buttons redesigned as solid white pills with Ionicons instead of translucent emoji buttons.
- Awards & Achievements "Your Stats" is now four distinct colored boxes (Saved/Meal Plans/Posts/Achievements) instead of plain text in one shared card.
- Meal-plan AI generation is server-flag-gated (`AppSetting: ai_meal_plans_enabled`, currently off) and shows a "Temporarily Unavailable" state in the app instead of erroring.

### Fixed
- **Center "+" tab button was misaligned** (overflowing the tab bar) — `AnimatedPressable` wasn't forwarding `style` to its outer element, breaking `flex: 1`. Rewritten as a single animated element.
- Achievement icon emoji and the peso sign in two Tagalog achievement descriptions were stored as mojibake since the original seed; fixed in the database and the seeder source.
- `XpService::award()` checked for a level-up before achievement bonus XP was added, so a bonus that crossed a level threshold in the same action could be missed. Also fixed a notification bug where achievement-unlock pushes always rendered a blank name (`$achievement->name` doesn't exist; the column is `title`).

## [1.9.0] — 2026-07-12

> Final billing architecture: the manual reference-number workflow described below was superseded before release by PayMongo-hosted GCash Checkout. Redirects are informational; only verified, idempotently processed webhooks activate entitlements. Cancellation-at-period-end, grace status, server-driven checkout availability, and centralized entitlement metadata are included. `expo-clipboard` was removed. Image moderation now requires a production queue worker and fails closed by default.

### Added
- **Seller Subscription screen** (`/subscription`) — tier catalog (Free / Basic Seller / Suki Seller / Negosyante) with 7-day/15-day/monthly/yearly pricing loaded from the server, current-plan card with per-store item usage, and a GCash payment sheet: tap-to-copy GCash number, exact-amount reminder, reference-number submission ("verified within 24 hours"), pending-verification banner with a withdraw option. Server-driven kill switch hides all payment UI without an app update.
- **Seller tier limits.** Free: 1 store / 10 items; Basic: 1 / 30; Suki: 2 / 30 each; Negosyante: 5 / 50 each (all editable from the admin dashboard). Hitting a limit when adding a store or item shows an upgrade prompt linking to the subscription screen — including when accepting a community price report that would add a new item.
- **Help & Support screen** (`/help`) — FAQ accordion (English/Tagalog, admin-managed) plus a support-ticket system: create tickets by category (payment, subscription, store, account, bug, other), chat-style thread (`/ticket/[id]`), support replies arrive as push notifications.
- Profile: new **Seller Subscription** and **Help & Support** rows.
- `expo-clipboard` (~8.0.7) for the tap-to-copy GCash number.

### Changed
- Stores hidden by an expired/refunded subscription (`hidden_by_plan`) disappear from buyer-facing surfaces (nearby, markets, profiles) but stay visible to their owner for management; nothing is deleted, everything restores on renewal.
- Backend now runs on **Asia/Manila** time — subscription expiries and payment timestamps read in local time.

---

## [1.8.0] — 2026-07-12

### Added
- **Item photos** — price reports and store items can carry one product photo (`photo` on `market_prices` + `community_price_reports`; accepted reports carry their photo onto the store's list). Pickers on Report a Price and the owner's Add/Edit Item modal; store price rows, review cards, and My Price Reports show the photo — or the item name's initials when there is none (`ItemThumb`).
- **Client-side image resizing** (`resizeForUpload`, expo-image-manipulator) on every upload: item photos 640px/q0.7, avatars 512px/q0.8, store profile 800px, covers 1280px/q0.75 — phone photos shrink from MBs to tens of KB before upload.
- **"Report this" for posts, recipes, and stores** — shared `ReportContentSheet` (reasons: explicit, not food-related, politics, showbiz/gossip, harmful, spam/scam, false info, other + optional details) wired to a flag icon on post detail, recipe detail, and store cover. Backend `content_reports` table (one report per user per item, status for admin review) + `POST /content-reports`.

- **Image moderation pipeline (backend)** — every uploaded photo (avatars, store photos/covers, item photos, price-report photos, post & recipe images) is screened after upload via `ModerateImageJob` (dispatchAfterResponse — no queue worker needed). Primary: **Claude Haiku vision** on the existing Anthropic key, gated by `MODERATION_MONTHLY_CAP` (default 2,000 imgs/month ≈ ₱120 worst case). Fallback: **self-hosted NSFWJS** service (`moderation-service/`, run `npm install && npm start`) when the cap is hit or Claude errors. Flagged images are stripped from their record and quarantined to `storage/app/quarantine/`; every result is logged in `image_moderations` for admin review. Unknown/unscannable results fail open — the in-app Report system is the human net. Prompt whitelists raw meat/fish photos as safe (food app!).

---

## [1.7.0] — 2026-07-11

### Added
- **Shared item categories** (`src/constants/itemCategories.ts`) — the store owner's Add Item form now offers the same 20 categories as Report a Price (was 7).
- **My Stores tabs** — [My Stores] [Price reports to review] segmented tabs (olive active state per the interactive-color standard) with a pending-count badge, replacing stacked sections.
- **AddButton component** — standard terracotta add pill (plus badge + label) used for Add item (store page), Add (My Stores), Add my Store (Prices tab); round icon add button on the shopping list; inline add rows (Add step / Add ingredient / Add tip) on create & edit recipe.

### Changed
- **"Set recipe as meal" picker** now follows the palette: olive selection chips/borders, terracotta confirm button and links.
- Community page: removed the header "+ Post" button (the center (+) tab covers creating posts).
- Store page: removed the "Edit store" chip (owner) and "Report" chip (visitors) beside the store name.

### Removed
- **Regenerate meal plan button** — AI regeneration was an unbounded Claude API cost; first-time Generate remains.

---

## [1.6.0] — 2026-07-11

### Added
- **Price report review workflow.** Store-targeted community price reports are now `pending` until the owner reviews them; accepting publishes the price onto the store's list (upsert into `market_prices`) and awards the reporter +5 XP; declining requires a reason (wrong price / wrong item / no such item / outdated / duplicate / spam). New endpoints: `GET /prices/my-reports`, `GET /tindahan-reports`, `POST /tindahan-reports/{id}/accept|decline`. Market-level reports still publish instantly; pre-existing reports were grandfathered as accepted.
- **My Price Reports screen** (`/my-reports`) — every report the user submitted with Pending/Accepted/Declined status chips and the decline reason. Reachable from a new receipt icon in the header row.
- **My Store header shortcut** — storefront icon in the header row, shown only to store owners.
- **Review section on My Stores** — pending report cards with Accept / Decline (+ reason bottom sheet) and a count badge.
- **Store page redesign** — full-bleed header (cover) photo with overlaid back button, circular store profile photo with cream ring, name + verified badge + location row (matches owner mockup).
- **Store photos** — `photo` + `cover_photo` columns on tindahan, `POST /tindahan/{id}/photos` upload endpoint, and a shared `StorePhotoPicker` (header 16:9 + profile 1:1, expo-image-picker) on both **Add my Store** and **Edit Store Info** forms.
- **PriceReportSeeder** — seeds 12 pending reports against "ITOY Sari Sari Store" for testing the review flow (`php artisan db:seed --class=PriceReportSeeder`).
- Report-a-Price success screen notes that store-targeted reports await owner approval.

---

## [1.5.0] — 2026-07-11

### Added
- **Filipino Food Palette rebrand — entire app.** Canonical palette (terracotta `#E7653B`, leaf green `#386641`, warm cream `#FFF8E8`, golden yellow `#F4B942`, charcoal `#292522`) applied to every screen; zero legacy/off-palette colors remain (grep-audited). Interactive-color standard: buttons/CTAs `#C45E3A`, active tabs/chips/toggles olive `#6E7B4A`, summary cards `#3C3A2F`, budget language gold, status leaf green.
- **New official logo** — owner-supplied hand-lettered "uLAm" traced SVG (`assets/ulam-logo.svg`), rendered by `ULamScriptLogo` (24 paths, cream `light` variant for terracotta headers). Applied app-wide.
- **Redesigned auth flow** (welcome / login / register) per mockups — cream surfaces, script logo, `FoodDoodles` line-art, bilingual taglines.
- **Home dashboard redesign** — cream header (logo, enlarged search/bell/avatar icons, real profile photo), "What will you cook today?" greeting, Budget Meal Plan hero card, 4-item quick-nav, "Popular This Week" recipe rail (save_count-ordered), 7-day date strip.
- **Footer menu** — 4 tabs + centered (+) button opening a Create sheet (Create Recipe / New Post / Log Spending / Report a Price). Awards tab relocated into Profile (with back chevron on awards screen).
- **Shopping list** — per-category "Check all", swipe-to-delete rows (gesture-handler `Swipeable`), and per-day local persistence via AsyncStorage (state survives navigation/app restarts; stale days auto-cleaned).
- **Report a Price** — expanded from 7 to 20 categories (Canned Goods, Noodles & Pasta, Bread & Bakery, Snacks, Beverages, Frozen Foods, Household Items, Baby Needs, etc.).
- **Store page** — "Prices updated N days/weeks ago" freshness line above the price list.
- **Community** — post avatars show the user's real photo (initials only as fallback).
- **Welcome screen** shows the app version.

### Changed
- Terracotta headers app-wide (GradientPageHeader gradient `#CC5027→#E7653B→#EC8156`, modal headers, profile curved header).
- Tab bar: cream bg, Ionicons, terracotta active state.
- Modal header titles now bilingual (Log Spending, Set Budget, Edit Profile, Notifications, Connections).
- `RecipeCoverPhoto` gained an optional `height` prop for compact cards.
- `react-native-worklets` pinned to 0.5.1 (SDK 54-compatible peer of reanimated 4.1) — fixes npm ERESOLVE and the latent TurboModule crash.

### Fixed
- `GestureHandlerRootView` restored at the root layout (Swipeable crash on shopping list).
- Laravel `public/storage` symlink was broken (plain file) — recreated via `php artisan storage:link`; avatars and storage images now load.

---

## [1.4.0] — 2026-06-25

### Added
- **Markets feature (Presyo tab)** — horizontal market card strip shows palengke/markets in user's municipality. Tap a market card to open the detail screen.
- **Market detail screen** (`market/[id].tsx`) — category tab strip (Isda, Karne, Gulay, Bigas, etc.) with full price list per category sorted cheapest first; relative timestamp and stall name per row; Report Price CTA at the bottom.
- **Dashboard history (Home tab)** — 8-day horizontal date strip (today + 7 days back). Tapping a past date switches to a history view showing that day's budget card (spent vs. budgeted, savings/overspend, notes) and meal plan card (grouped by meal type).
- **Backend: `GET /markets`** — lists active markets in the authenticated user's municipality with stall count, item count, and last-updated timestamp.
- **Backend: `GET /markets/{id}`** — returns market info, stall list, and all prices grouped by category.
- **Backend: `GET /budget/for-date?date=YYYY-MM-DD`** — returns budget period + daily log for any past date.
- **Backend: `GET /meal-plan/today?date=YYYY-MM-DD`** — `today()` now accepts an optional date param for historical lookup.

### Fixed
- **Pinch zoom in recipe gallery** — removed the horizontal `ScrollView` that prevented Android from receiving 2-finger touch events. Replaced with a single `PanResponder` on a plain `Animated.View` strip (`ZoomableGallery` component) that handles both 1-finger swipe (navigate between photos) and 2-finger pinch (zoom + pan). No more gesture conflict.

---

## [1.3.0] — 2026-06-24

### Added
- **"Shared by" bottom sheet** on recipe detail — avatar stack (up to 5) with initials fallback; "+X more" chip opens a modal listing all sharers; individual avatar/row taps navigate to the sharer's profile.
- **RecipeCoverPhoto header style** applied to recipe cards embedded in the Komunidad feed (gradient/collage/font consistent with the recipe detail header).
- **Community feed seeding** — `UserSeeder` (17 Antipolo City users) and `CommunityPostSeeder` (20 text posts + 10 recipe shares + 15 × shares of user 14's recipe, 7 posts with 10–18 comments each) extracted to standalone seeders and called from `DatabaseSeeder`.

### Fixed
- **Community feed showing only 4 posts** — all seeded users now have `municipality = 'Antipolo City'` to match the exact string used in the feed location filter.
- **`plan` ENUM constraint** — changed `'free'` → `'libre'` in `UserSeeder` to match the valid ENUM values.

### Removed
- `react-native-reanimated` and `react-native-gesture-handler` — caused a TurboModule crash in Expo Go (`installTurboModule` argument count mismatch). Replaced `ZoomableImage` with a `PanResponder` + core `Animated` implementation; removed `GestureHandlerRootView` from `_layout.tsx`.

---

## [1.2.0] — earlier

_(Pre-changelog releases; history not reconstructed.)_
