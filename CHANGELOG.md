# uLam App — Changelog

All notable changes to this project are documented here.
Format: `## [version] — YYYY-MM-DD` · sections: Added, Changed, Fixed, Removed.

## [1.32.1] — 2026-07-20

### Changed
- **Home tile "My Recipe Book" is now "My Shopping List"**, opening the new shopping lists home. Recipe Book stays reachable via Profile > Saved Recipes and the Meal Plan tab's Bookmark tab. Any admin-uploaded theme background for this tile position keeps applying.

## [1.32.0] — 2026-07-19

### Added
- **Shareable shopping lists.** The shopping list now lives on the server (it used to exist only on your device), which unlocks sharing: pick any of your accepted connections and they see your list live. They can check items off as they buy, add missing items, and correct prices/quantities to what the tindera actually charged, with names shown beside who checked or added what. You watch it update as they shop (the list refreshes itself every few seconds while shared). Sharing is a Premium feature for the list owner only; the people you share with never need Premium.
- **Event lists.** Besides today's list (built from your meal plan, same as before), you can now create standalone lists for team building, fiesta, or handaan, optionally shared with co-workers or kamag-anak. Event lists never touch anyone's personal budget: completing one just locks it with an itemized summary and total, ready to use as a liquidation record.
- **Tingi prices on staples.** Ingredients like toyo, suka, and asin now show the price of the smallest amount you can actually buy (sachet, takal) instead of a proportional estimate nobody can hand a tindera, with the recipe's real amount kept as a note ("kailangan: 2 tbsp"). The staples list is admin-managed.
- **Tapping a push notification now opens the right screen** (a shared list, a connection request, a profile), including from a cold start. Previously notification taps just opened the app.

### Changed
- **Shopping list screens restructured**: a lists home (today's list, event lists, shared with me) plus the familiar list detail. All the existing interactions are preserved: category grouping, check-all per category, inline price/qty editing with the "edited" badge, swipe-to-delete (owner only now), add-item row. The totals card now shows two numbers: "Cash to bring" (everything on the list) and "Bought so far" (checked items only).
- **Completing a list logs only what was actually bought** (checked items, at the price actually paid). Unchecked items are excluded from the spend and flagged "not bought" in the final summary. If nothing is checked, the app offers to log the full total like before, so nothing changes for those who never used the checkboxes.

## [1.31.0] — 2026-07-19

### Added
- **Connections, separate from Followers.** Following stays one-tap like before, but there's now a real "Connect" system too, like adding a friend: you send a request, the other user approves it, and only then are you connected. The Connections screen gains a third tab showing incoming requests (Accept/Decline), sent requests (Cancel), and your accepted connections. Profiles now show a Connect button beside Follow, reflecting the request state (Connect, Pending, Accept request, Connected).
- **Relationship labels on connections** (Household, Relative, Normal, plus whatever the admin adds): tap the label chip on a connection to set one. Labels are private; only you see the labels you set. This is groundwork for shared shopping lists, where you'll pick connections to share with.

## [1.30.14] — 2026-07-19

### Changed
- **Report a Price no longer asks for city/municipality separately** — now that a market or store must be selected (see below), its own address is already known and more accurate than asking the user to type/pick it again. Removed the "Location" field and its picker entirely.
- **"Which market or store?" is now required**, not optional. The "General area (no specific store)" option is gone. Backend now rejects a report that has neither `market_id` nor `tindahan_id`, and derives the report's `municipality`/`barangay` from the selected market/store's own address instead of falling back to the reporting user's registered address — more accurate, since a user could be reporting a price while out of their home area.

## [1.30.13] — 2026-07-19

### Fixed
- **Crash on the new city/municipality picker** ("Encountered two children with the same key"). Many Philippine city/municipality names are genuinely reused across different provinces within the same region — e.g. "BURGOS" appears 4 times in Region I alone — so a name-keyed list produced duplicate React keys and, worse, picking one could silently resolve to the wrong city. City selection is now keyed by its actual PSGC code (always unique) instead of its name, and the picker shows "City (Province)" only for the specific names that actually collide within a region, to disambiguate without cluttering the common case.

## [1.30.12] — 2026-07-19

### Changed
- **Region/city/barangay are now cascading selects instead of free text**, on both the "Where do you live?" onboarding step and the Location settings page — region first, then city/municipality (filtered to that region), then barangay (filtered to that city), preventing misspelled or inconsistent location data. Backed by a bundled PSGC-derived dataset (17 regions, ~1,600 cities/municipalities, ~42,000 barangays), no network round trip needed. Onboarding now also saves `region`/`province` (auto-filled from the picked city), which it never collected before.
- **"Use my current location" (GPS) on the Location page** still prefills from reverse geocoding as before, since the OS geocoder's names don't reliably match this dataset's exact spelling — the barangay picker stays locked until the city is re-confirmed through its own picker, which is what actually resolves a match.

## [1.30.11] — 2026-07-18

### Fixed
- **Admin-side account changes (e.g. manually granting Premium) didn't reach an already-logged-in user until they logged out and back in.** Nothing ever refetched the signed-in user's data on its own — the in-memory account state just sat however it was at login until something explicitly refreshed it. Now refreshes automatically when the app returns to foreground (throttled to at most once per 30s) and whenever the Meal Plan tab gains focus, so a Premium upgrade (or any other admin-side account change) takes effect without a manual re-login.

## [1.30.10] — 2026-07-18

### Fixed
- **"Add to Today's Meal Plan" sheet on the recipe page ran behind the Android nav bar.** The app-wide fix from v1.30.4 mounts its black filler at the root of the main navigation stack, but this sheet is a React Native `Modal`, which renders in its own separate native window outside that tree — so the filler never reached it. Extracted the filler into a shared `AndroidNavBarFiller` component and added it to this modal directly.

## [1.30.9] — 2026-07-18

### Fixed
- **Pull-to-refresh had no visible spinner on Android, app-wide.** Every one of the app's 23 pull-to-refresh instances set only `tintColor`, which is an iOS-only `RefreshControl` prop — Android needs the separate `colors` prop, which was never set anywhere. The refresh itself was likely firing, but with no visible indicator it looked broken. Added the matching Android `colors` prop to every instance.
- **Upgrading to Premium could show "still free" even after a successful payment.** Two compounding bugs: (1) after returning from the PayMongo checkout browser, the code checked `user.plan` from a stale closure instead of the freshly-fetched value, so the success screen almost never fired even when the backend had already granted Premium; (2) PayMongo's webhook is delivered asynchronously and can lag a few seconds behind the checkout browser closing, so a single immediate check could read the account before the webhook had processed. Now uses the actual fresh value returned by the refresh call, and retries briefly (up to ~10s) before telling the user it's still processing instead of silently showing stale "Free" status.

## [1.30.8] — 2026-07-18

### Added
- **Email verification on signup.** Registration now emails a 6-digit code (same OTP pattern already used for password reset and secondary-email verification) and requires it before the app lets a new account into onboarding. New `/verify-email` screen, with a resend action and a "not you? log out" escape hatch. Existing accounts were grandfathered in as already-verified, so nobody currently registered is affected.



### Fixed
- **Recipe page comments**: the previous release's height→padding switch didn't fix the real cause. The comment compose row sits at the very bottom of one long ScrollView; when the keyboard shows or hides, the ScrollView's viewport resizes but its scroll position doesn't recompute on its own, leaving stale blank space (visible immediately on focus, worse after the keyboard closes). Now explicitly snaps the scroll position to the true bottom on both the show and hide keyboard events, instead of relying on the resize alone.

## [1.30.6] — 2026-07-18

### Fixed
- **Report a Price / Recipe / Store page comment boxes**: switched keyboard-avoidance from Android's "height" resize behavior to "padding" on all three. "height" computes each shift relative to its own previous value, which under this app's edge-to-edge Android setup could drift — leaving a field still slightly covered by the keyboard (Report a Price), or a large blank gap left behind after the keyboard closed (Recipe page comments). "padding" recalculates from scratch each time, so it self-corrects instead of drifting.
- **Bottom tab bar**: added a bit of extra Android-only bottom padding so the tab icons/labels aren't sitting flush against the new solid black nav-bar strip (that strip now covers exactly the safe-area space the tab bar used to blend into unnoticed).
- **Recipes list and Meal Plan list**: increased bottom spacing so the last card's content isn't hidden behind the (now more visually solid) bottom tab bar.

## [1.30.5] — 2026-07-18

### Fixed
- **Store page**: the comment box was completely covered by the keyboard when focused (it sat inside a plain scroll view with nothing pushing it clear). Now wrapped in a keyboard-avoiding view like the recipe and Report a Price comment fields already were.

## [1.30.4] — 2026-07-18

### Changed
- **Android navigation bar is now pure black app-wide**, with light icons for contrast. The previous cream nav bar color never actually applied — this app's Android setup enforces edge-to-edge, under which the OS ignores a requested nav bar color entirely and just shows whatever the app draws underneath it. Now draws an actual black bar in that exact zone at the app root, so it's consistent on every screen regardless of edge-to-edge. Needs a fresh native build to show up in an installed APK.

## [1.30.3] — 2026-07-18

### Fixed
- **Report a Price**: fixed a regression from the previous release where the Price field could get pushed down into the keyboard instead of clear of it (a keyboard offset that was tuned for the old native header no longer applied once that header moved inline).
- **"Boost this" sheet and "Cover & Photo Style" sheet**: fixed a regression from the previous release where the bottom padding overshot, leaving a visible gap showing the page underneath instead of a clean edge-to-edge sheet.
- **Recipe page comments**: tightened the spacing above the compose row and added a small margin below it instead.
- **Market page**: header re-themed to the terracotta gradient.

### Changed
- Corrected two em dashes that slipped into the market price disclaimer added last release.

## [1.30.2] — 2026-07-18

### Fixed
- **Your Store page**: header re-themed to the terracotta gradient, edit-store icon switched from an emoji to the app's standard Ionicons pencil, and the "Boost this" sheet no longer gets cut off by the Android navigation bar (a shared component used on both stores and recipes, so this fixes it everywhere it appears).
- **Create Recipe**: the "Cover & Photo Style" picker sheet's bottom no longer sits behind the Android navigation bar.
- **Recipe page comments**: the keyboard no longer covers the comment field while typing (the whole page was missing keyboard-avoidance). Editing a comment now reuses the same bottom compose field instead of a separate inline box — matches the existing "replying to" pattern, with an "Editing your comment" banner in its place.
- **Report a Price**: header re-themed to the terracotta gradient; fixed the keyboard covering the bottom field on Android (was using `padding` behavior on both platforms — Android needs `height`); added "liter(s)" to the unit list.
- **Location page**: header re-themed to the terracotta gradient.
- **Market/store price lists**: added a note that prices come from a mix of sources (community reports, store owners, government DTI/DA references) and may not always match exactly.
- **Home screen "Popular This Week" → See all**: was linking to My Recipe Book (your own saved recipes) instead of the actual popular/all recipes list — now correctly opens Menu Plan > Recipes.

---

## [1.30.1] — 2026-07-17

### Changed
- **"Saved" tab removed from the Awards screen** — saved recipes now live at Profile > Saved Recipes (a new button right below Connections), pointing at the existing My Recipe Book screen instead of a second, separate saved-recipes list that duplicated it.
- **My Insights, Seller Subscription, and My Store headers** now use the app's terracotta gradient theme instead of plain white, matching the rest of the app. Seller Subscription's refresh icon and My Store's Add button were recolored to white/light so they stay visible against the new background instead of nearly disappearing into it.

### Added
- **Community post images are now tappable** — opens a full-screen enlarged view with a close button.

### Fixed
- **Community's type filter chips (All/Recipes/Price Tips/etc.) could get pushed off-screen** with no way to reach them, same issue as the Prices page radius chips fixed earlier — that row is now horizontally scrollable.

## [1.30.0] — 2026-07-17

### Added
- **Daily & weekly tasks checklist** on the Awards screen — shows today's/this week's tasks (admin-managed, see the new admin Gamification section) with a checkmark once completed. Completion is automatic: it happens the moment you perform the real underlying action elsewhere in the app (generate a meal plan, report a price, share a community post, log your spending) — there's no separate "mark done" button — and awards the task's own bonus XP on top of what that action already earns.

## [1.29.2] — 2026-07-17

### Fixed
- **Recipes tab (Menu Plan > Recipes) felt laggy on every interaction** — bookmark, share, even scrolling. Root cause: the recipe card's render function was being redefined on every single re-render (including on every mutation's pending-state flip), which forced every visible card to fully rebuild itself each time. Extracted it into a proper memoized component so only the specific card that actually changed re-renders.
- **Bookmarking a recipe didn't visually save** (icon stayed grey, no feedback) — it waited for a full network round-trip and list refetch before showing anything. Now updates instantly (optimistically), same pattern already used for the share toggle, and reverts automatically if the request fails.
- **A recipe's budget tag sometimes showed as a raw "budget_400plus" string** instead of a price like "₱600" — 3 official recipes (Kare-Kare, Pork Ribs BBQ, Lechon Kawali) had an old, invalid budget tag left over from before the app's budget scheme was expanded from 4 tiers to 7. Corrected the 3 recipes' data and the seed data behind them; also fixed the same stale 4-tier scheme in the My Achievements budget label map and in the admin recipe editor (which could only ever tag a recipe over ₱400 as "₱400+", not the correct 600/800/1,000/1,000+ tier — that's how the bad data got there in the first place).
- **Community feed felt laggy** (react/scroll interactions) for the same root cause as the Recipes tab above — the post card's render function was being redefined on every puso reaction, forcing every visible post to rebuild. Same memoized-component fix applied.

## [1.29.1] — 2026-07-17

### Fixed
- **Level-up celebration (XP pill, "LEVEL UP!" card, confetti) was getting covered by the success screen's own text and button.** It was mounted as the *first* child in Log Spending and Report a Price's success views, and React Native paints later siblings on top — so the plain success text/button underneath it were actually rendering in front. Moved it to render last (paint order in RN follows JSX order for siblings) and added a defensive `zIndex` so it always wins regardless of what a screen renders around it.

## [1.29.0] — 2026-07-17

### Added
- **Full-screen confetti burst on level-up**: reaching a new XP level now bursts ~60 animated SVG confetti pieces in brand colors across the whole screen, alongside the existing "LEVEL UP!" card. Built with `react-native-svg` (already a dependency) and transform/opacity-only animation, so it runs on the native thread and won't compete with anything happening on the JS thread.

## [1.28.6] — 2026-07-17

### Fixed
- **Community feed's collapsing header stuttered while Prices' didn't**: Community's list virtualizes/recycles post cards as you scroll, which keeps the JS thread busy enough that continuously tracking scroll position to drive the header's collapse (a JS-thread-only animation — height/position can't run on the native thread) visibly lagged and jumped a few pixels behind. Switched to a threshold-triggered snap: the header now smoothly animates between expanded/collapsed once via a single short transition when you cross a scroll threshold, instead of trying to update on every scroll frame. Prices (a plain, non-virtualized list) was already smooth and is unchanged.

## [1.28.5] — 2026-07-17

### Fixed
- **Community and Prices headers disappeared** (last release's jitter fix had a bug): the header's animated height defaulted to 0 before its first measurement, and a 0-height clipped container prevented it from ever reporting its real size back — so it stayed collapsed to nothing, with page content sitting under the status bar. The header now starts at its natural auto-size until measured, then switches to the scroll-driven animation.

## [1.28.4] — 2026-07-17

### Fixed
- **Community and Prices tabs**: fixed the feed shaking/jittering while scrolling under the collapsing header. Root cause was the header shrinking as a real layout sibling of the list, which resized the list's own box while it was being actively dragged and fought with native scroll tracking. The header (and, on Community, the tabs/filter row) are now absolute overlays on top of the list instead, so the list's own box never changes size during a scroll gesture.

## [1.28.3] — 2026-07-17

Collapsing-header polish, a real regional-coverage fix for Report a Price, and a themed header pass on three utility pages.

### Changed
- **Community and Prices tabs**: the collapsing header now stops shrinking once it reaches the logo/search/notifications/avatar row, instead of collapsing that row away too — that row now stays pinned near the top while browsing, with the tabs/filters sitting right below it.
- **Log Spending, Spending History, and My Recipe Book**: headers now use the app's terracotta gradient theme (matching Home/Community/Prices) instead of a plain white bar.

### Fixed
- **Report a Price location field**: the city/municipality picker added last release was a hardcoded Metro Manila-only list, which broke the field for anyone outside that area (e.g. Mindanao or Visayas users would see no relevant options). It's now built from the same region-aware `/markets` lookup the store picker already uses — which falls back to the signed-in user's own registered municipality — so the options shown are always relevant to wherever in the Philippines the user actually is.

## [1.28.2] — 2026-07-17

A round of layout/UX fixes across onboarding, Log Spending, Prices, budgeting, meal planning, and Report a Price, plus a smarter Community feed header.

### Fixed
- **Onboarding "Where do you live?" step**: the "Updated terms" gate now shows Terms & Conditions and Privacy Policy in a sliding-up sheet in place, instead of navigating to a separate page that ended up hidden behind the gate's own overlay. The "I have read and agree" button no longer sits under the Android navigation bar.
- **Onboarding budget field ("Or enter your own amount")**: every keystroke was closing the keyboard, forcing you to tap back into the field for each digit. Root cause was each onboarding step being redefined as a new component on every render (losing focus on re-render); all four steps are now stable components.
- **Log Spending**: removed a duplicate header (native router header stacked on top of the screen's own header) and fixed the bottom of the confirmation screen overlapping the Android navigation bar.
- **Prices page**: the "Within 3/5/10/15 km" radius chips and Map button could get pushed off-screen with no way to reach them; that row is now horizontally scrollable.
- **Add to Today's Meal Plan** (from a recipe page): top and bottom of the sheet now clear the Android status bar and navigation bar.
- **Report a Price**: bottom of the form no longer overlaps the Android navigation bar; the market/store picker list is no longer cut off by the nav bar on its last item; and Location (city/municipality) is now a pick-list instead of free text, to avoid misspellings and inconsistent capitalization.
- **Community feed**: the gradient header now collapses out of view as you scroll down, letting the All/Following tabs and filter chips ride up and stay put near the top instead of permanently taking up a quarter of the screen; scrolling back to the top brings the header back.

## [1.28.1] — 2026-07-17

Fixes status/navigation bar contrast when the phone is in system dark mode.

### Fixed
- **Status bar and Android navigation bar icons could turn white/invisible** when the phone's own dark mode was on, since they were following the system theme instead of the app's own always-light cream theme. They're now pinned to dark icons (light icons only on the recipe page's full-bleed photo header, where they need the contrast) and the Android navigation bar background is pinned to match the app.

## [1.28.0] — 2026-07-16

AI-generated meal plan dishes are now full, deletable recipes.

### Added
- **Generated meal plan dishes are now real recipe pages** — tapping a dish on Menu Plan > Plan opens a full recipe page with ingredients, step-by-step instructions, and tips, exactly like any other recipe.
- **Generated recipes are yours** — they're posted under your account (categorized "Mine" on Menu Plan > Recipes), support ratings and thumbs up/down like any normal recipe, and can be deleted individually from the recipe list, the recipe detail page, or all at once with a new "Delete All" action on the "Mine" section.

### Changed
- **Backend**: the AI prompt used for meal plan generation now also asks for cooking steps, tips, difficulty, prep/cook time, and tags, since these are needed to render a full recipe page (previously the AI was only asked for ingredients and cost).

## [1.27.1] — 2026-07-15

Regenerate is back on Menu Plan > Plan, Premium-only like Generate.

### Added
- **"Regenerate Plan" button** on an existing meal plan — replaces today's plan with a fresh AI-generated one. Premium-only, matching Generate; shows "Upgrade to Regenerate" and routes to the Upgrade screen for non-Premium accounts instead of attempting it.

### Fixed
- **Backend**: regenerating could delete a user's existing plan even when they weren't allowed to generate a replacement, leaving them with nothing. The Premium check now happens before the existing plan is touched.

## [1.27.0] — 2026-07-15

AI meal plan generation is now a Premium-only feature.

### Changed
- **AI meal plan generation now requires uLam Premium** — the previous "3 free per month" tier has been removed, since each generation is a real, billed API call. The Generate button now reads "Upgrade to Generate" for non-Premium accounts and goes straight to the Upgrade screen instead of attempting (and failing) generation.

## [1.26.1] — 2026-07-15

Recipe author display fixed on My Recipe Book, plus recipe page layout polish.

### Added
- **My Recipe Book now shows the community author's name** ("by {name}", clickable to their profile) on saved recipes from other users — this screen never had author info before.

### Changed
- **Recipe page**: Views moved below the thumbs-up vote button, and the "Edited ... ago" line moved below the Save/bookmark button. The author's avatar there is about 40% bigger for better visibility.
- **Author avatars removed from the Menu Plan > Recipes list and My Recipe Book list** (both now show "by {name}" as text only, no avatar) to keep those cards less cluttered; the Recipe detail page keeps its avatar.

## [1.26.0] — 2026-07-15

Admin-editable Premium pricing with an optional promo discount, plus two bug fixes.

### Added
- **uLam Premium pricing is now admin-editable** (Content > Monetization), instead of being fixed at ₱59/month and ₱499/year.
- **Promo discount system**: the admin can turn on a discount for either plan, set a promo name (e.g. "Mother's Day special discount!"), and the Upgrade screen shows a strikethrough original price, the discounted price, a "Saved ₱X" callout, and a promo banner. Checkout charges the discounted amount whenever a promo is active.

### Fixed
- **The "set up your budget first" error was always shown in Tagalog**, even with the app set to English. Now respects the app's language setting.
- **The Yearly pricing card's radio button was covered by the "SAVE" badge** on the Upgrade screen; they no longer overlap.

## [1.25.1] — 2026-07-15

Follow-up fixes for the v1.25.0 recipe-authorship and About the App features.

### Fixed
- **Recipe author still wasn't showing on the recipe list or detail page**: every seeded recipe had been mislabeled "Community" with no author (a seeder default bug), so the community-author condition never matched. Corrected the labeling and seeded real community-authored recipes to confirm the fix.
- **About the App page showed a duplicate header** ("About" from the screen's default header, plus "About the App" from the page itself). The default header is now hidden, leaving a single "About the App" header, consistent with every other settings sub-page.
- **About the App body text wasn't showing**: the public endpoint had an empty fallback instead of the real default text, so it displayed blank until the admin manually saved something. Now shares the same default text as the admin editor.

## [1.25.0] — 2026-07-15

Bigger avatars, fixed profile navigation, recipe authorship, and a redesigned Settings page with a new About the App screen.

### Added
- **Settings redesigned as a clean flat list** (My Account, Location, Languages, Help & Support, Rate Us, Share, Privacy Policy, Terms of Service, About the App, Log Out, app version), replacing the old page of stacked edit forms. The existing Profile/Secondary Email/Delete Account, Location, and Language settings still work exactly the same, just moved onto their own screens (My Account, Location, Languages).
- **Rate Us and Share rows** on Settings, linking to the Play Store listing and sharing the app respectively.
- **About the App** page, with content (title, body, company name, company link) editable from the admin panel with no app update needed.

### Changed
- **Avatars are about 20% bigger everywhere** (comment threads, feed cards, profile pages, Awards, search, connections), except the small header icon-row avatar, which is unchanged.
- **Recipe detail page**: Tags, Author, and Views now appear before the "Edited ... ago" line (previously Edited was at the top); the community author name is clickable and opens their profile.
- **Menu Plan > Recipes list**: the community author's name is now clickable and opens their profile.
- **Recipe detail page's Budget/Cost/Servings/Time strip** now uses the same 4 admin-editable colors as the Awards "Your stats" tiles, so changing those colors in the admin panel updates both places.

### Fixed
- **Tapping a commenter's name or avatar** on a community post or a recipe now opens their profile (it previously did nothing).

## [1.24.2] — 2026-07-15

Header icon circle polish, plus an app-wide sweep to remove em dashes from user-facing copy.

### Changed
- **Header icon circles (search, price reports, notifications, settings, avatar) are less opaque** (down from ~88% to ~78%) and their drop shadow was removed; the Level/XP progress bar track is unchanged.
- **Header icon circles on the Home tab now have a border** (a darker shade of each circle's own fill color, e.g. a darker orange border on the orange avatar-initials circle) so they read clearly against the cream page background.
- **Em dashes removed from all user-facing copy** in the mobile app and admin panel, replaced with a colon, comma, parenthesis, or a new sentence depending on context.

## [1.24.1] — 2026-07-15

Follow-up polish on the v1.24.0 readability pass, plus a fix for a regression it introduced.

### Changed
- **Header icon circles (search, price reports, notifications, settings, avatar) are more opaque** (~88%, up from ~12-22%) so they read as solid buttons instead of a faint tint over the photo header; their icons switched to black to stay visible against the now much lighter circles (the drop shadow from v1.24.0 was removed from these specific icons since it no longer serves a purpose on an opaque light circle).
- **The Level/XP progress bar track is more opaque** (~88%, up from ~28%) so it reads as a clear bar against the header photo.

### Fixed
- **Profile page avatar was rendering as a pill/oval instead of a circle** — rewritten with explicit pixel dimensions instead of relying on Tailwind utility classes for the circular clipping.
- **Awards & Achievements avatar fallback (initials) was showing black instead of orange** — a side effect of the v1.24.0 charcoal→black text sweep incorrectly catching a background color. Restored to the same orange used on the Profile page's avatar fallback.

## [1.24.0] — 2026-07-15

Readability pass: bigger everything, real black body text, header elements that pop.

### Changed
- **Header icons are bigger and pop against the colored header** — search, price reports, notifications bell, settings gear, and the avatar icon all grew (40px → 44px circles, larger glyphs) and now cast a drop shadow so they read clearly against terracotta/photo headers instead of blending in.
- **Menu Plan tabs (Plan / Recipes / Bookmark) are bigger**, and the inactive tab's label now carries a text shadow so it stays legible sitting directly on the gradient/photo header (the active tab already sits on a solid cream pill, so it didn't need one).
- **Page header titles and subtitles are bigger** (title 22→26px, subtitle 12→14px) with a text shadow for the same reason.
- **Body text is bigger app-wide** — bumped Tailwind's type scale one notch (`text-xs` 12→13px, `sm` 14→15px, `base` 16→17px, etc.) and bumped the two smallest inline text sizes (12px/13px, the most common caption/meta sizes) by 1px across the app.
- **Main body text is now true black** (`#000000`) instead of the softer charcoal (`#292522`) — every `text-ink` usage and every inline charcoal text color switched over, app-wide.
- **Avatars are bigger everywhere they appear** — profile page (96→112px), Awards header (72→84px) and leaderboard rows, public user profile (64→72px), community feed cards (36→40px), post/recipe comment threads, the "shared by" avatar stack, the sharers list, connections list, search results, and the top-nav avatar icon.

### Note
This reverses the earlier "charcoal, not black — softer and warmer" text-color decision, per explicit request after comparing readability against other apps.

## [1.23.2] — 2026-07-15

### Added
- **uLam Premium link on Profile page** — a new row (above Seller Subscription) links straight to the Upgrade screen, showing current status (Free / Premium / free trial). Previously the only path there was a buried row on the Awards page.

## [1.23.1] — 2026-07-15

### Changed
- **Premium subscription screen: single plan selection** — the Monthly and Yearly boxes are now tappable, radio-style selectors (checkmark indicator, highlighted border/fill when selected) instead of two separately-priced buttons at the bottom. One "Subscribe Now" button checks out whichever plan is selected (defaults to Yearly).
- **Premium screen header is now admin-themeable** too (Content → Theme → "Premium subscription header") — same photo + color-overlay control as the other headers; looks identical to today until the admin configures it.

## [1.23.0] — 2026-07-15

Color palette fixes, Market page layout cleanup, and an admin-editable Premium features list.

### Added
- **uLam Premium's "Included in Premium" list is now admin-editable** (Content → Monetization) — edit titles, descriptions, emoji, and free/premium status without an app release. Falls back to the current built-in list until the admin saves something.

### Changed
- **Market page header decluttered** — "Refresh prices" and "Report" moved out of the title row (where they were squeezing the market name) down to the Get Directions row, as compact icon buttons.
- **Filipino Color Palette applied** to the Upgrade (Premium) screen, the Market page, and the Store page — replaced the old leaf-green (`#386641`) and off-palette Tailwind amber accents with the app's actual brand tokens (terracotta `#C45E3A`, olive `#6E7B4A`, charcoal `#3C3A2F`, tan `#E5A26F`).

### Fixed
- **My Stores empty state** — the checkmark was rendering as literal text (`✅`) instead of a checkmark, from an encoding slip in the previous release. Now a proper `Ionicons` checkmark icon (no more emoji-encoding risk in that spot).

## [1.22.1] — 2026-07-15

Closes a gap from v1.22.0: Profile and Awards & Achievements headers were forgotten from the theming rollout.

### Changed
- **Profile and Awards & Achievements headers are now admin-themeable too** — both already had their own photo+gradient hero header (shared "Profile hero header" section, separate control from the Menu Plan/Community/Prices header) but weren't wired into the Theme admin page. Now they are, with today's exact look as the fallback.

## [1.22.0] — 2026-07-15

Admin-controlled theming, a real Premium gateway with streak trials, and recipe page upgrades.

### Added
- **Admin Theme page** — the header (Menu Plan, Community, Prices), the 5 Home dashboard boxes (Meal Plan hero + My Recipes/Spending History/Awards/Recipe Book tiles), and the 4 Awards "your stats" boxes can now have their background photo (with a 9-point focal-point picker and cover/contain fit) and color overlay set from admin (Content → Theme), with the built-in look as the fallback until something is configured.
- **Photo header on Menu Plan, Community, and Prices** — matches the photo+gradient treatment already used on Home and Awards.
- **Recipe comments** — every recipe now has a comment thread at the bottom (reply, edit within 3 hours, delete your own), moderatable from admin (Recipes → Recipe Comments).
- **Premium quota pill + upgrade prompt** — the Meal Plan screen now shows how many free AI plans are left (or Premium/Trial status) and links straight to Upgrade; hitting the monthly AI limit now offers an "Upgrade →" button instead of a dead-end alert.
- **Streak-earned free Premium trials** — reaching a 3-day or 7-day activity streak now grants 3 or 7 free days of uLam Premium automatically, with a notification explaining why.

### Changed
- **Recipe share is text-only now** — shares the full recipe (ingredients, steps, tips) as text with hashtags and an "Install uLam App" line, instead of a captured image card. More reliable across apps and carries the actual recipe, not just a title card.
- Recipe page's view count now sits below the category tags instead of above them.
- The radio circle in "set recipe as meal" now has a visible border when unselected.

### Fixed
- My Stores' empty "price reports to review" state now shows a clearer ✅ instead of a stray 🏷️.

### Removed
- `expo-file-system`, `expo-sharing`, and `react-native-view-shot` — only used by the old image-capture share flow, now unused.

## [1.21.1] — 2026-07-14

Profile editing consolidated into Settings; navigation cleanup.

### Changed
- **Edit Profile moved into Settings** — name, username, bio, household size, and dietary preferences now live in a Profile section at the top of Settings, together with Location, Language, and Secondary Email. The separate Edit Profile screen (and the Edit button on the Awards header) is gone — one place to change everything about your account.
- **Connections is now a Profile row** — moved out of the Awards header into the Profile page, styled like the other rows (My Stores, Seller Subscription, My Insights), placed above Awards & Achievements.
- Profile avatar badge icon changed from a pencil to a **camera outline** — it changes your photo, so it should look like it.

## [1.21.0] — 2026-07-14

Home visual refresh, permanent budget explainer, and admin-replaceable logo.

### Added
- **Replaceable logo** — the logo everywhere in the app (welcome, login, Home header, Profile, page headers, tab headers) can now be swapped from the admin dashboard (Content → Branding) with no app update: two slots, one for light backgrounds and one white version for terracotta headers. Empty slots fall back to the built-in uLam script logo.
- **Budget explainer is now permanent** — a gold (!) info badge on the empty-budget card opens the "what is a food budget?" sheet anytime (replaces the show-once behavior).

### Changed
- **Home visual refresh per the new mockup** — the Budget Meal Plan hero now sits on a food photo under a dark-olive→terracotta gradient, and the four quick actions (My Recipes, Spending History, Awards, Recipe Book) became photo tiles with distinct color washes (terracotta/gold/leaf/charcoal), bright white icons with shadows, and bolder dark labels.

## [1.20.1] — 2026-07-14

Home screen fixes from on-device testing.

### Fixed
- **Search now does what its placeholder promised** — the Home search box said "recipes, ingredients, users" but the search page only found people. It now searches recipes (by title, ingredient, or tag) and people together, in sections; recipe results open the recipe page.
- **The 7-day calendar strip fits the screen** — day boxes now share the width evenly instead of overflowing (Tuesday was getting cut off).

### Added
- **First-time budget explainer** — tapping "Set up budget" the first time opens a friendly sheet explaining what the food budget is, why it's the heart of uLam, and the three steps (set amount → get fitting meals → log and save). Shown once; after that the button goes straight to setup.

## [1.20.0] — 2026-07-14

Interactive nearby map, smarter search, real popularity ranking.

### Added
- **Nearby Map** — a "Map" button next to the radius chips on the Prices tab opens an interactive OpenStreetMap view: your location, a radius circle, and color-coded pins for markets (green) and independent stores (terracotta). Tapping a pin shows a detail card with distance, source/verified badge, "View prices," and Directions. Built on Leaflet/OSM — no API keys, works in Expo Go and standalone builds alike.

### Changed
- **"Popular This Week" is now actually weekly popularity** — recipes rank by real views in the last 7 days (boosted first, all-time saves as tiebreaker) instead of all-time save counts.
- **Recipe search now looks inside ingredients and tags** — searching "manok" finds Chicken Tinola even though the title doesn't contain the word.
- Profile header photo asset slimmed from 952 KB to 247 KB (faster load, smaller app).

### Backend (same release)
- Hourly `ulam:maintenance` job: seller-subscription renewal reminders (3 days ahead), expiry flips for ended subscriptions (with store-visibility re-sync) and boosts, stale OTP pruning.
- New `TECHNICAL.md` operations guide in the backend repo: production cron setup, queue worker, deploy checklist, env vars, security runbook, EAS/FCM/maps instructions, backups.

## [1.19.0] — 2026-07-14

Terms & Conditions and Privacy Policy, with mandatory acceptance.

### Added
- **Legal documents in-app** — Settings now has Terms & Conditions and Privacy Policy rows; each opens a reader showing the current published version with its version number and date.
- **Mandatory acceptance gate** — when a new version of either document is published from the admin dashboard, a blocking sheet appears on next app use: review each document, then "I have read and agree." Acceptance is recorded per user per version (with timestamp, IP, and device) — required for Play Store compliance and clean legal footing.

## [1.18.0] — 2026-07-14

Password reset and account deletion — the two table-stakes account features the app was missing.

### Added
- **Forgot password** — the login screen's "Forgot password?" link (previously dead) now opens a real flow: enter your email → receive a 6-digit code → set a new password. Resetting logs out every other session. The endpoint answers identically whether or not the email exists, so it can't be used to probe for accounts.
- **Delete account** — a Danger Zone at the bottom of Settings, requiring your password plus a final confirmation. Deletion permanently removes the profile, recipes, posts, stores, ratings, comments, meal plans, budgets, and sessions; the payment ledger is retained for financial records and community markets are unlinked rather than destroyed. (Required by Google Play for any app with account sign-up.)

### Fixed
- **Every database table was silently running on MyISAM** (WAMP's default engine), which ignores foreign keys and transactions — meaning no cascade deletes and no atomic billing operations, ever. All 63 tables converted to InnoDB, and Laravel now forces InnoDB for all future migrations.

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
