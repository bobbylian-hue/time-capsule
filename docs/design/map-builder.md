# Map builder (地圖編輯)

Status: plan for Roy's review (2026-11-23). Nothing is built yet.

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

**The one hard rule:** outside the city's map tiles, adding is refused, because the map is blank there and nobody can see what they're placing.

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

## Roles

| | Owner, Admin | Moderator | Viewer |
|---|---|---|---|
| Build Wayposts, Landmarks, City Hunts, questions | ✓ | | |
| Private hunts: see answers | ✓ | | |
| Private hunts: Hide / Show | ✓ | ✓ | |
| See everything else | ✓ | ✓ | ✓ |

Every change goes in Activity, and Undo works for the newest change to each thing.

## Who builds what

**Claude (UI):** the builder toolbar and cards, reading names and buildings from the tiles, the grid overlay, building selection and recolouring, the eight models, the City Hunt map editor, the private hunt detail, the Questions page. Built against the development sample first, behind a switch, like admin phase 2. Journey reads monuments from the server instead of the code list.

**Codex (backend and art):**

- Wayposts: a `photo` field and a public picture bucket; add and move without the tick and note; store each Waypost's level-17 cell and return same-cell neighbours to the card; Overview counts.
- Landmarks: a monument table (buildings by tile id with colour and height, model with size, colour and rotation, custom tiers, seal point) moved over from `mapHtml.ts` with the existing Landmarks byte-for-byte; add, edit, Make Landmark, Hide/Show with Undo; vessel and stamp choice; per-Landmark fight health and time with the current defaults; monuments returned to Journey with nearby Wayposts.
- City Hunts: draft, staff-only and published states; admin add and edit of area, Keeper, quests and settings; staff-only hunts visible only to admin members.
- Private hunts: admin list and detail reads; Hide/Show for moderators; answer reads logged.
- Questions: the pool list across cities with Used in.
- Art: the default Landmark picture, vessel and stamp, reviewed with Roy.

Exact RPC names and fields go in the Codex prompts once Roy approves this plan.

## Order (fastest path to an in-person test)

1. **MB1 Wayposts and Landmarks** on the map, plus the default art in parallel.
2. **MB2 City Hunts** on the map with Staff only, then walk one.
3. **MB3 Private hunts** monitoring and the **Questions** page.

Claude builds a clickable demo of MB1 and MB2 for Roy to try before any of it is built for real.

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
