# Hunt loop: time capsules and hunts as one game

Claude, 2026-11-18. Status: **Roy approved the direction on 2026-11-18; build in waves (see Work list).** Clickable demo: [`demos/hunt-loop.html`](demos/hunt-loop.html). Open the file directly in a browser; add `#en` for English. The demo is disposable and its code is not for porting. Its questions, names and prices are sample data, not checked facts. The quest pictures in the demo are code-drawn placeholders until art task HL-A1 lands.

## Why
Roy wants the game to feel organic and simple, with time capsules and hunts combined, and with game-like motion (motion graphics, not slides). Public capsules move onto Waypost racks; a capsule sent to a place becomes a route built from the same quests as a private hunt; one daily hunt per city teaches the City Hunt loop without any walking.

## The map has two kinds of thing
- **Gem = Waypost.** A common Waypost is the blue gem, and it does exactly two things: **Spin** for wax balls and the **capsule rack**. It turns purple while Spin cools down. The Landmark is the big gem. Nothing else is drawn as a gem.
- **Pin = quest.** Every quest everywhere uses the **same quest pin**: a teardrop with a picture inside. The **picture shows what the quest does** (like Monopoly Go: same square, different job). The **colour says who made it**: **blue** = made by us (Today's Hunt, City Hunt), **brass** = made by a person (private hunt, route to a friend, Memory Route). **Purple with a tick** = done, for both. A number shows the order.
- A place photo (template or organizer photo) is no longer the pin face; it shows in the quest card banner.

## Five quest types (one set everywhere)
| Type | Picture | What happens at the pin |
|---|---|---|
| Arrive | footsteps reaching a flag | Reach the pin (within the action radius); done |
| Question | magnifying glass on a clue | Answer a question: multiple choice or typed. From the city pool, or the sender's own |
| Guess the price | price tag | The named-place price puzzle in US dollars, local money shown. 3 tries, higher/lower hints, within 10% wins |
| Catch | cracked capsule and wax ball | Corrupted Capsules appear at the pin for this player; catch the set number (default 3, 1–5) |
| Landmark | Landmark tower with seal | The Landmark fight. Offered only when the pin is within **2 km** of a Landmark; the pin sits on the Landmark Waypost |

- **Spin is not a quest type.** Spinning is what the gem does. Existing spin quests become Arrive.
- Location is required for every type (Catch now has a place). Existing location-free restore quests keep working until their hunt ends; editors can no longer create spin or restore.

## Rules every capsule shares
- **Every capsule works the same way and uses the same opening pages.** It has a time lock, plus an optional route and an optional question lock. The checklist and hold-to-open are the same for all of them.
- **Public capsules always use the bottle.** It is unlimited and never uses copies, so cosmetic and special vessels stay precious.

## 1. Today's Hunt (replaces the daily price card)
- Each city has its own daily hunt: **3 blue quest pins** (Question, Guess the price, Catch), the same for everyone that day, placed at pool places **within about 1.5 km of the city's Landmark**.
- Played **from anywhere**. After **Play**, the motion sequence runs:
  1. The camera swoops in and the three pins drop from the sky one by one.
  2. The figure hops along a dotted trail that draws itself, leaving fading footsteps, while the camera tilts and turns toward the next pin.
  3. On arrival the pin bounces with a ripple and the quest card flips up out of it.
  4. A right answer bursts the pin into purple with sparkles and the points fly into the score counter; a wrong answer shakes the card and the pin still turns purple.
  5. The camera pulls back to show the whole trail, and the city's Passport stamp slams onto the result.
  - Every move is about a second; **Speed up** makes it four times faster; Reduce Motion fades in place.
- Scoring: 10 for a right answer or a full catch, 2 otherwise. A finished day pays **3 wax balls once**, and keeps the streak. **Catching from home pays points only, never vessel copies.** No Landmark fight from home.
- **No global leaderboard.** Own score and streak plus a friends-only board.
- Questions come from the city question pool (below). CE1's daily price questions move into the pool.

## 2. City Hunt: quests become blue quest pins
- After the player agrees with the Keeper, the hunt's quests **drop onto the map as blue quest pins**, numbered, purple when done. The Keeper no longer holds the list.
- Each pin needs the player within the action radius, checked on the server. The Landmark is last.
- Timer, Keeper reward and Passport stamp are unchanged.

## 3. Waypost racks (public capsules)
- One card for each Waypost: **Spin** on top, the **capsule rack** below.
- **No limit per rack**, like an ema rack. Filters: All, Ready, Waiting, Has a question, Friends, Mine. Paged.
- To leave a capsule (within 100 m): letter and hint, wait 1/7/30/365 days, lock **none** or **my own question** with an answer. Questions pass the word check and can be reported.
- The first person to open it takes it into their Inbox. **Unopened capsules stay on the rack**; nothing is returned or expires.
- Retired: floating public pins, drift, pass-on, the 124,741 drop places, CE2 jigsaw (a jigsaw may come back later as a lock).
- Existing public capsules move to the nearest rack within 1 km; the rest are **deleted** (mostly test data; Roy, 2026-11-18).

## 4. Sending to a place = a route
- Create step 4 asks **where**: **Anywhere** or **Walk a route**. No separate one-place option.
- A route is **1–5 brass quest pins built exactly like a private hunt's quests** (same editor, same five types).
  - **City templates** give 3 stops with types and pool questions already set, so sending takes a few taps. Per stop: change type (five chips), **Another question / Another price**, **Write my own**, **Remove**.
  - **Tap your own places** adds stops on the map; each starts as Arrive.
- The recipient walks the stops in order (server-checked); the capsule opens after the last stop once the time has come.
- **Memory Route** is the same flow sent to future me with your own places, not a separate feature.

## 5. Vessel copies
- Starters are unlimited. Each catch gives **3 copies** of that vessel; each send uses one.
- Existing owners start with **10 copies** of every non-unlimited vessel they own.
- A vessel at ×0 **stays collected**; it can't be sent until caught again. Copies replace duplicate stars.
- **Unlimited copies is a per-vessel admin switch**, on for the four starters and every earned Landmark vessel.
- The Shop is unchanged.

## Contracts (Codex builds to these; Claude builds screens against mocks of them)
Names follow the glossary in `AGENTS.md`. Codex may choose table layouts; RPC names and payload fields below are the contract. Every RPC is `security definer`, authenticated only, checks location on the server where stated, and never returns an answer or sealed content early.

**Quest object** (returned to players, same shape everywhere):
`{ quest_id, ordinal, type: 'arrive'|'question'|'price'|'catch'|'landmark', location_lat, location_lng, name_zh, name_en, image, points, done, locked, question?: { kind: 'choice'|'text', prompt_zh, prompt_en, choices?: [{zh,en}] }, price?: { place_zh, place_en, prompt_zh, prompt_en, currency, rate, tries_left }, catch_count?, landmark_id? }`

**Quest attempt** (one RPC per context, same payload): `{ quest_id, lat, lng, accuracy, answer?: { choice?: int, text?: string, usd?: number } }` → `{ ok, done, points, hint?: 'higher'|'lower', tries_left?, correct_answer? (only after done) }`. Catch and Landmark complete from the existing catch / Landmark-win paths when the caught capsule or fight belongs to that quest.

**Question pool** (admin-managed): per city, `type 'question'|'price'`, place name zh/en, location, prompt zh/en, choices zh/en, answer (secret), price usd + local amount + currency + rate, source URL, checked date, photo + credit + licence, status draft/published/hidden.

| Package | RPCs (new names) |
|---|---|
| Racks | `waypost_rack(waypost_id, filter, cursor)` → `{ count, items: [{ capsule_id, sender (portrait, name), hint, opens_at, ready, has_question, is_friend, is_mine }], next_cursor }`; `rack_leave(waypost_id, lat, lng, accuracy, body, hint, wait_days, lock_question?, lock_answer?)`; `rack_open(capsule_id, lat, lng, accuracy, answer?)` → content, first opener takes it (row lock), else `taken` / `too_early` / `wrong_answer` / `too_far` |
| Copies | `vessels.unlimited_copies`; owned rows gain `copies`; `send_capsule` refuses `no_copies`; catch adds the game setting `copies_per_catch` (3); Album/Cabinet/Create payloads return `copies` (null = unlimited); admin `admin_vessel_set_unlimited`, `admin_player_adjust_copies` (audited) |
| Quests | shared quest model for City Hunt steps, private hunt quests, route stops and Today's Hunt; `city_hunt_quests(hunt_id)` and private-hunt payloads return quest objects; `quest_attempt(context, payload)` or one attempt RPC per context with the payload above |
| Today's Hunt | `todays_hunt(city)` → `{ date, quests[3], score, finished, streak }`; `todays_hunt_attempt(city, ordinal, answer)` (no location; catch sends `{ caught }`, capped, points only); `todays_hunt_friends(city)`; finish pays 3 wax balls once per day |
| Routes | `route_templates(city)` → templates with stops (type + default pool question); `send_capsule` gains `route: [{ location_lat, location_lng, name, type, pool_id?, own_question?, own_answer?, catch_count? }]`; `route_progress(capsule_id)` → quest objects for the recipient; `route_attempt(capsule_id, payload)`; `open_capsule` requires route complete + time |

## Admin impact
- **Question pool (new):** list, add, edit, publish, hide; re-check flag after 6 months; shows where each question is used.
- **Today's Hunt calendar (new):** each city's upcoming days, reorder or swap a quest.
- **Wayposts:** rack contents and Remove a capsule.
- **Moderation:** senders' own questions (racks and routes) go through the word check; reports go to the existing review queue.
- **Vessels:** unlimited-copies switch, copies per catch, adjust a player's copies.
- **Settings:** Today's Hunt and puzzle rewards.
- **Later:** staff-built city route templates, reusing the private-hunt editor.
- **Removed:** the drop-place layer and drifting public capsules. Roles unchanged.

## Work list (parallel waves)
Each Codex package is its own session, branch, Git worktree and PR. Claude builds each screen against a development mock behind a flag, then wires to the real RPCs when Codex reports. Order of release inside a wave: backend first (migration held until the app that uses it is ready), then app, as in earlier releases.

**Wave 1 (start now, all in parallel)**
| ID | Owner | What |
|---|---|---|
| HL-A1 | Codex art | Five quest-type pictures (arrive, question, price, catch, landmark) in the quest-template style |
| HL-C1 | Codex | Racks backend, public capsule move/delete, retire drift/pass-on/drop places; admin rack contents |
| HL-C2 | Codex | Vessel copies backend; admin switch and adjust |
| HL-C3 | Codex | Shared quest model and the five types; retire spin; City Hunt quests with locations; question pool tables + admin RPCs |
| HL-Q1 | Codex | Collect the question pool for Taipei, Hong Kong, Singapore, Macau to the spec in HL-C3 (data + sources, review file) |
| HL-U1 | Claude | Quest pin component, Journey (gem = Waypost only), Waypost card with Spin + rack + leave form (mock) |
| HL-U2 | Claude | Copies in Create step 3, Cabinet and Album (mock) |

**Wave 2 (after HL-C3 is reviewed)**
| ID | Owner | What |
|---|---|---|
| HL-C4 | Codex | Today's Hunt backend; retire the daily price card's RPCs after old apps are gone |
| HL-C5 | Codex | Route capsules backend and city route templates |
| HL-U3 | Claude | Today's Hunt screen with the motion sequence |
| HL-U4 | Claude | Shared quest editor (private hunt + Create step 4 route), City Hunt quest pins, recipient route view |
| HL-U5 | Claude | Admin screens: question pool, Today's Hunt calendar, rack contents, copies |
