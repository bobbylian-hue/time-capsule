# Map builder (地圖編輯)

Status: plan for Roy's review (2026-11-23). Nothing is built yet. Clickable demo of MB1 and MB2: [`demos/map-builder.html`](demos/map-builder.html). It needs a local server because it loads our map tiles: from the repository root run `python3 -m http.server 8088` (stop the app first) and open http://localhost:8088/docs/design/demos/map-builder.html.

## Why

We want to start testing City Hunts in person soon. Today a new Landmark, its 3D monument and every City Hunt go through Codex and an SOP, and only Wayposts can be added in admin, with a 250 m warning, a required safety tick and typed names. The team should be able to build the game on the admin city map: drop a Waypost or a Landmark anywhere, have it named for them, give it a picture, shape a Landmark from real buildings or a ready-made model, lay out a City Hunt, and watch private hunts. Removing something is always one tap, and the pickup circle is 100 m, so the builder warns instead of refusing.

Roy's words (2026-11-23): Wayposts and Landmarks are added on the map with a default name and picture that can be changed; borrow Niantic's grid idea for our own use; a Landmark is a place we choose, made from a real building (recolour it and choose which outlines belong to it) or a default 3D object that fits the map, with a default vessel and picture; City Hunts are added on the map; owners and admins can see private hunts to monitor them; the question bank is separate from hunts; don't over-limit where things go.

This replaces three admin phase 2 rules in [`admin.md`](admin.md): the 250 m warning that needed a note, the required safety tick, and "Landmarks and City Hunts stay with agents and the SOPs". The SOPs remain for art (vessels, stamps) and new cities.

## Answers first

### Where do default names come from?

**Our own map tiles already have them, free.** The Protomaps tiles we ship (OpenStreetMap data) carry a `pois` layer with `name`, `name:zh-Hant`, `name:zh-Hans`, `name:en` and a `kind`. One tile near Taipei Civic Square holds 1,847 named places: 國父紀念館 / Sun Yat-sen Memorial Hall (arts_centre), 中山公園 / Zhongshan Park (park), 松山文創園區 / Songshan Culture and Creative Park (attraction), 巴洛克花園 / Baroque Garden (garden).

When you tap the map, the builder reads the named places nearby from the tiles already on screen and fills in the closest one. A short list under the name lets you pick another nearby name with one tap. With nothing named within about 60 m, it falls back to the street or neighbourhood name, and you can always type your own.

- Chinese name: `name:zh-Hant`, else `name` when it is Chinese, converted to Traditional. English: `name:en`, else empty for you to fill in (many shops have no English name).
- The tiles are from 2026-11-07. New places appear when the tiles are rebuilt; nothing else changes.
- **No paid service is needed.** Google Places would give names and photos, but its terms don't let us store them as our own Waypost names or pictures, so we'd be paying for something we can't keep. If we ever want more places than OSM has, the free Overture Maps and Foursquare open places datasets are the next step, not Google.

### Where do default pictures come from?

- **Wayposts** use our five illustrated scenes (park, garden, waterfront, square, public art). The builder picks one from the place's `kind` (park → park, garden → garden, beach/pier/water → waterfront, artwork/monument/attraction → public art, everything else → square). Change it with one tap, or **upload a photo** instead.
- **Landmarks** get a new default Landmark picture (Codex draws it), or an uploaded photo.
- A photo must be one we may use: our own, or one with a reuse licence, with credit. The upload form has an optional credit line.

### What we borrow from Niantic's grid

Niantic splits the world into S2 cells and allows one stop per level-17 cell (about 70 m in our cities). We take the grid as a **guide, not a rule**:

- In edit mode the map can show the level-17 grid. Cells that already hold a Waypost or Landmark are lightly shaded.
- Adding into a shaded cell shows a soft note ("中山公園 is in this cell, 42 m away") and saves anyway. No reason needed.
- The city card on Overview shows how full each city is: Wayposts, and the share of grid cells inside the map area that have one (like Niantic's "saturation"). It tells us where the map is thin.
- We don't copy the gym thresholds: our Landmarks are chosen by hand, not promoted by counts.
- The existing 250 m spacing stays only for the automatic seed script.

## Part 0: City borders on the map

Roy (2026-11-23): Taipei sits inside a bigger area, so without a visible border it is easy to add things outside the city.

- **Every city has a border:** its real outline from OpenStreetMap (Taipei City, the whole of Hong Kong, Macau and Singapore), cut to where our map tiles reach. Codex stores it with the city.
- **On the admin map** the border is a dashed ink-blue line. Outside it the map is covered by a light grey veil, and the city's name sits on the line.
- **Outside the border** the ＋ tools don't place anything: tapping there shows "Outside Taipei. Wayposts, Landmarks and quests go inside the dashed line." Moving something across the line is refused the same way.
- **Two cities side by side** (later, such as Taipei and New Taipei) each have their own border, and the map shows both. A tap goes to the city it falls in.
- A border can be widened later in the city's settings (Part 6), as long as the tiles reach.

## Part 1: Wayposts

On the city map, **Edit** opens the builder toolbar: **＋ Waypost**, **＋ Landmark**, **＋ Question**, **Grid** on/off.

**Add.** Tap **＋ Waypost**, tap the map. The gem drops there and the card opens already filled in: name (zh/en) from the tiles, picture from the place kind. **Save** is enabled at once. You can change:

- Name, with the nearby-names list.
- Picture: the five scenes, or **Upload photo**.
- Position: **Move**, then tap the new spot.

**Soft notes, never blocks** (shown in the card, all optional to act on):

- Same grid cell as another Waypost (name and distance).
- Inside an area the tiles mark as a school, hospital, place of worship, cemetery or military land. This replaces the required tick.
- Inside a live City Hunt area (its name), when hiding.

**The one hard rule:** outside the city's border (Part 0), adding is refused.

Hide, Show and Activity Undo stay as they are.

## Part 2: Landmarks

A Landmark is a Waypost with a monument, a fight, a vessel and a Passport stamp. Today each of those is written by hand (the monument is code in `mapHtml.ts`). The builder makes all of them choosable, each with a default, so a new Landmark is playable the moment it is saved.

**Add.** Tap **＋ Landmark** and tap the map, or select a Waypost and tap **Make Landmark**. The card has four sections; every one starts filled in:

1. **Name and picture.** Name from the tiles, as for Wayposts. Picture: the default Landmark picture, or upload.
2. **Look (the 3D monument).** Mix any of these:
   - **Real buildings.** Tap buildings on the map to add or remove them; selected ones turn the chosen colour at once. This is how you choose "which outline to which outline": a square framed by several buildings is a few taps. A **Height** slider sets how tall they stand (toy scale, as today). **Colour**: the Landmark blue gradient (default), or one of ink blue, light blue, glass, wax red, brass.
   - **Ready-made model**, for a spot with no building, such as a park, a fountain or a pier. Eight models built from the map's own shapes, so they match the toy city: **Tower, Pagoda, Gate, Fountain, Column, Pavilion, Dome, Statue**. Each has Size (S / M / L) and Rotate. Same colour choice.
   - **Seal only**, nothing built.
   - The seal floats over the monument; **Move seal** places it, and the fight point moves with it.
3. **Reward.** Vessel: the default Landmark vessel, or any earned vessel we already have (Red Bird, Clock Tower…). A shared default vessel won the second time adds a star, like any duplicate. Stamp: the default Landmark stamp, or a Landmark's own stamp once Codex draws one. The Passport shows the Landmark's name under its stamp, so a shared stamp still reads as its own place.
4. **Fight.** Health and time, starting at the current Landmark defaults (40 HP, 150 s).

The three existing monuments (Taipei 101, Senado, HKUST) are moved into the same data with no visible change, so they become editable too. Taipei 101's flared sections stay hand-tuned and show as "Custom" in the Look section.

**Default art Codex draws** (following `design/art/STYLE.md`, one review with Roy):

- Default Landmark picture (the spin scene for a Landmark).
- Default Landmark vessel: a small keepsake that says "I beat a Landmark" without naming a place.
- Default Landmark stamp: ink blue, double ring, no lettering.

The eight ready-made models are code, not art: Claude designs them as stacks of the map's own boxes, discs and arcs.

## Part 3: City Hunts on the map

The Hunts page gets a **City Hunts** list per city. **New City Hunt** opens the map:

1. **Landmark**: tap one (or make one first, Part 2).
2. **Area**: a circle that starts at 1 km around the Landmark; drag its edge to resize, drag the middle to move.
3. **Keeper**: tap where the Letter Keeper stands. His meeting spot name comes from the tiles like any other name.
4. **Quests**: the same quest editor private hunts use, with the five quest types. Arrive and catch pins are tapped onto the map; question and price quests are picked from the question bank (located questions inside the area show as faint pins to tap); the landmark quest is the hunt's Landmark.
5. **Settings**: name (default 「<地區>城市定向」 / "<Area> City Hunt"), time limit (60 minutes), reward (+300 XP, 5 Gold Wax Balls, repeat 50 XP), open date, and the stamp (default City Hunt stamp until Codex draws its own).

**Staff only, then Publish.** A new hunt starts **Staff only**: it shows on Journey only for admin members, so the team can walk it in person and fix pins on the spot before any player sees it. **Publish** makes it public; the usual one-open-hunt-per-city rule applies then. Edits after the first player joins lock the route, as for private hunts.

## Part 4: Watching private hunts

The Hunts page gets a **Private hunts** list: every private hunt in every city, with its organizer (portrait), status (draft, published, ended, hidden), players, finishes and reports. Opening one shows its quests and guide on the map and a progress table per player, read only.

- **Owner and admin** see everything, including quest answers (viewing answers is logged in Activity).
- **Moderator** sees everything except answers, and can **Hide** or **Show** a hunt.
- **Viewer** sees the list and map only.

The city map's private hunt layer (already there) gets a tap-through to the same detail.

## Part 5: Question bank, apart from hunts

Today the Hunts page is mostly the question pool. It becomes its own page, **Questions (題庫)**, in the admin menu:

- One list for all cities, filtered by city, type (question, price), status, located or not, and used or unused.
- A **map view** shows located questions as pins; **＋ Question** on the city map drops one at a spot with the place name filled in from the tiles.
- Each question shows **Used in**: Today's Hunt dates, City Hunts, route templates.
- Editing works as today (draft → published, Hide, Undo).

**Hunts** keeps Today's Hunt calendar, City Hunts and Private hunts. Quests still copy a question when they are saved, so editing the bank never changes a hunt someone is already playing. Questions an organizer writes in a private hunt stay in that hunt; they don't enter the bank.

Admin menu after this: Overview · Questions · Hunts · Corrupted Capsules · Levels · Review · Members · Activity (city maps stay under Overview).

## Part 6: Cities, from new to live

"Add a city" means taking it all the way to a **live** city that players can play, Today's Hunt included (Roy, 2026-11-23).

**Which cities can be added.** Our map tiles already cover ten areas: Taipei, Hong Kong, Macau, Singapore (live now) and Tokyo, Kyoto, Seoul, Bangkok, Beijing and Kuala Lumpur (tiles only). **New city** in Overview lists the six with tiles. Anywhere else needs Codex to extend the tiles first; the list shows those as "Needs map tiles" with a ready-to-copy prompt.

**A city has three states**, like a City Hunt:

| State | Who sees it |
|---|---|
| Draft | Admin only |
| Staff only | Admin members on Journey, for walking it in person |
| Live | Everyone |

**Bootstrapping.** A new city starts empty. Its page has **Starter pack**: a ready-to-copy prompt for Codex, filled in with the city's name and border. Codex runs the existing seed script (OSM safety filter, park paths, squares, waterfronts) and makes one file with:

- suggested Wayposts with names and scenes,
- Corrupted Capsule spots,
- 30 or more located questions and prices near the planned Landmark, with sources,
- a suggested Landmark and a list of vessel ideas for the city (Part 7).

You **upload the file** on the city page. Everything in it lands on the map as **suggestions** (dashed outlines), never straight into the game. Accept them one by one, **Accept all in view**, or remove the ones you don't like. Then add your own on top with the builder.

**Settings:** names (zh/en), time zone, local currency and its US dollar rate (for price questions), the map's starting view, and the border.

**Go live checklist.** **Make Staff only** and **Go live** are enabled once every line is ticked. Each line links to where you fix it:

- [ ] Border set and inside the map tiles.
- [ ] At least 20 Wayposts.
- [ ] At least one Landmark with a look, vessel and stamp.
- [ ] Corrupted Capsule spots, and at least three vessels that can appear (one each of common, uncommon and rare).
- [ ] **Today's Hunt ready:** enough published located questions within 1.5 km of the Landmark for the next 14 days, and the calendar filled.
- [ ] A City Hunt (optional; can come after going live).

Going live is one tap and shows in Activity. Taking a city back to Staff only hides it from players again, and nothing is deleted.

## Part 7: Vessels from a prompt

Roy's idea (2026-11-23): pick an item from a list of popular things, copy a ready prompt to Codex, Codex makes the files, upload them, and the vessel is ready.

**The list.** Each city's page has **Vessel ideas**: a list Codex writes for the starter pack, by kind, each with its Chinese and English name, a one-line description, a suggested tier and a reference link. Ideas we've already drawn are marked done. Kinds, with examples for the new cities:

| Kind | Tokyo | Seoul | Bangkok | Kuala Lumpur |
|---|---|---|---|---|
| Food | taiyaki | hotteok | mango sticky rice | nasi lemak in banana leaf |
| Everyday object | ekiben lunch box | onggi jar | pinto food carrier | wau kite |
| Craft or keepsake | furin wind chime | bojagi wrapped bundle | paper umbrella | batik roll |
| Nature | cherry blossom branch | magpie | lotus bud | hornbill |
| Festival (date window) | moon-viewing dango | Chuseok songpyeon | Loy Krathong float | Mid-Autumn lantern |
| Landmark (earned) | Tokyo Station | Gwanghwamun gate | Rama VIII Bridge | Sultan Abdul Samad Building |

The rules from [regional vessels](regional-vessels.md) still apply: draw the signature thing itself, not its box; no brands, sacred objects, official emblems or text. For the four live cities, the list starts with the 12 wave 2 ideas already planned there.

**Make one.** Tap an idea, tap **Copy prompt**. The prompt is filled in from `design/art/STYLE.md` and the vessel SOP (style block, the item, its reference, tier, how it opens, idle motion) and asks Codex for one **vessel pack**: the layer images, a small motion file, the crack overlay, and 40 px and 120 px previews.

**Upload and check.** Upload the pack on the vessel's page. Admin shows it like the app will: closed, idle, opening, as a Corrupted Capsule, and at 40 and 120 px. **Approve** (owner) or **Send back** with a note.

**Put it in the game.** Choose what it is: a Corrupted Capsule vessel for the city (tier, which cities, hours or dates), a Landmark's earned vessel, or a Shop vessel. It works in the app straight away, with no app release.

- **This needs one app change:** today every vessel's pictures are built into the app, so a new vessel needs a release. The app will also load vessels from our server. Vessels already in the app stay as they are.

**Art styles later.** Each vessel's pictures are stored under a style, `classic` for everything today. A pixel style is the same kind of pack drawn differently, so it can be added vessel by vessel. A 3D style needs a 3D viewer and comes much later. Whether players choose a style or collect styles as rewards is a later decision.

## Part 8: Also in this phase

Things Roy didn't ask for that the in-person tests will need:

1. **Field tools on the phone.** Admin works at 375 px, so staff can fix things while walking: **Move here** puts a Waypost, Landmark seal, Keeper or quest at your current GPS spot; **Report a problem here** (photo and note) goes to the Review queue; staff can reset their own City Hunt progress to walk it again; and a small GPS line shows accuracy and distance to the nearest pin.
2. **Corrupted Capsule spots in the builder.** ＋ Spot, Move and Hide, so a new city or a newly built area gets capsules without a seed run.
3. **Numbers to learn from tests.** A Waypost's card shows spins, level, last spin and capsules on its rack. A City Hunt shows its funnel: joined → checked in → each quest → finished, the median time, and where people stop. Overview lists Wayposts nobody spun in 14 days.
4. **Select an area.** Draw a box to hide, show or accept many things at once (for a park closed for works, or a starter pack).
5. **Map tiles per city.** Today all ten areas are one 99 MB file, so adding a city means rebuilding and uploading everything. Codex splits it into one file per city, and moves the tiles from the rate-limited `r2.dev` address to our own domain before many players use them.

**Later, not now:** players suggesting Wayposts (like Niantic's Wayfarer), opening hours for parks that close at night, and names in more languages.

## Roles

| | Owner, Admin | Moderator | Viewer |
|---|---|---|---|
| Build Wayposts, Landmarks, City Hunts, questions | ✓ | | |
| Add cities, upload starter packs and vessel packs | ✓ | | |
| Approve a vessel pack, take a city live | Owner | | |
| Private hunts: see answers | ✓ | | |
| Private hunts: Hide / Show | ✓ | ✓ | |
| See everything else | ✓ | ✓ | ✓ |

Every change goes in Activity, and Undo works for the newest change to each thing.

## Who builds what

**Claude (UI):** city borders on the map, the builder toolbar and cards, reading names and buildings from the tiles, the grid overlay, building selection and recolouring, the eight models, the City Hunt map editor, the private hunt detail, the Questions page, the city pages and go-live checklist, the vessel ideas, prompt and pack preview, and the field tools. The app learns to show vessels loaded from the server. Built against the development sample first, behind a switch, like admin phase 2. Journey reads monuments from the server instead of the code list.

**Codex (backend and art):**

- Wayposts: a `photo` field and a public picture bucket; add and move without the tick and note; store each Waypost's level-17 cell and return same-cell neighbours to the card; Overview counts.
- Landmarks: a monument table (buildings by tile id with colour and height, model with size, colour and rotation, custom tiers, seal point) moved over from `mapHtml.ts` with the existing Landmarks byte-for-byte; add, edit, Make Landmark, Hide/Show with Undo; vessel and stamp choice; per-Landmark fight health and time with the current defaults; monuments returned to Journey with nearby Wayposts.
- City Hunts: draft, staff-only and published states; admin add and edit of area, Keeper, quests and settings; staff-only hunts visible only to admin members.
- Private hunts: admin list and detail reads; Hide/Show for moderators; answer reads logged.
- Questions: the pool list across cities with Used in.
- Art: the default Landmark picture, vessel and stamp, reviewed with Roy.
- Cities: borders from OSM, the three states, settings, starter pack files (seed script output) and upload as suggestions, the go-live checklist, tiles split per city on our own domain.
- Vessels: vessel packs stored on our server under a style, upload checks, approval, and catalogue settings without an app release.
- Field tools, spots in the builder and the test numbers.

Exact RPC names and fields go in the Codex prompts once Roy approves this plan.

## Release plan (Roy approved the plan and demo, 2026-11-23)

Roy asked for releases small enough to have few bugs but not so small they're slow. The last big combined release took days of stop-and-fix. So the map builder ships as **six releases, one at a time**, each a single slice that can be checked in about an hour:

| Release | What | Who sees it | Why this size |
|---|---|---|---|
| **R1 Wayposts** | City borders, ＋ Waypost with names from the tiles, photos, the grid and soft notes, ＋ / Move capsule spots, Move here, Waypost numbers | Admin; players see uploaded photos on the spin screen | Admin only, one migration, no change to how the game plays |
| **R2 Landmarks** | Monuments move from code into data (Journey reads them), the Landmark builder, the default picture, vessel and stamp | Admin; players see new Landmarks | Touches Journey, so it goes alone |
| **R3 City Hunts** | City Hunt editor, Staff only, the funnel numbers, staff reset of their own run | Admin; staff on Journey | Then we walk a hunt in person |
| **R4 Cities** | Draft → Staff only → Live, starter pack upload as suggestions, settings, the go-live checklist with Today's Hunt, tiles split per city | Admin; players see a new city when it goes live | |
| **R5 Vessel packs** | Vessel ideas, prompt, upload, preview, approve; the app loads vessels from the server | Admin; players see new vessels | Changes how the app loads art, so it goes alone |
| **R6 Watch and questions** | Private hunt monitoring and the Questions page | Admin only | |

**Rules for every release**

1. **One slice:** one held migration (Codex) and one screen PR (Claude), behind that release's own switch (`MAP_BUILDER_R1`…).
2. **Built in parallel, released in order.** Codex builds the backend while Claude builds the screens against the development sample. The next release can be built while the current one is checked, but it isn't released until the current one is closed.
3. **Checked before merge:** Claude reviews the backend PR, Codex reviews the screen PR, and both run the release's checklist on localhost (375 px and desktop, zh and en) against the held migration.
4. **Release order:** merge the screens with the switch off → apply the one migration → turn the switch on → run the short production checklist with disposable data → remove it.
5. **A bug found in production is fixed inside that release** with a small follow-up PR. New ideas go to a later release, not this one.
6. **The default art** (Landmark picture, vessel, stamp) is drawn now in parallel, so it's approved before R2.

## Roy to confirm

Defaults apply unless Roy changes them.

1. Names come from our own map tiles, with nearby names to pick from and typing as a fallback. No paid place service.
2. The level-17 grid is a soft note only; saving into a shared cell needs no reason.
3. Automatic area notes (school, hospital, place of worship, cemetery, military) replace the required safety tick.
4. The eight ready-made Landmark models are drawn from map shapes, not 3D model files, so the map stays light on phones.
5. Building colours: Landmark blue gradient by default, plus ink blue, light blue, glass, wax red and brass.
6. One shared default Landmark vessel and stamp; winning the vessel again adds a star.
7. New City Hunts start Staff only, visible to admin members on Journey until published.
8. Moderators can hide private hunts but can't see their answers.
9. Organizer questions stay in their own hunts and don't join the bank.
10. City borders are the real OSM outline, cut to the tiles; nothing can be added outside.
11. A city goes Draft → Staff only → Live, and Live needs the checklist, including Today's Hunt for the next 14 days.
12. Starter pack items arrive as suggestions to accept, never straight into the game.
13. A new vessel needs Roy's approval in admin before it can be put in the game.
14. Vessel pictures are stored under a style (`classic` now), so pixel and 3D styles can be added later.
