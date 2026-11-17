# City Explorer and the daily puzzle

Claude, 2026-11-17. Status: Roy approved the demo; the screens are built against sample data and the backend is with Codex. Clickable demo: [`demos/city-explorer.html`](demos/city-explorer.html). Open the file directly in a browser and add `#en` to the URL for English. The demo is disposable and its code is not for porting. It was made before Roy chose US dollars for guessing, so it still guesses in local money. Its prices and counts are sample data, not checked facts.

## Why
Everything in the game today needs you to be standing in Taipei, Hong Kong, Singapore or Macau. Someone in New York has nothing to do. The answer Roy chose:

**Get to know a city from your sofa, then go there and open it.**

| Where you are | What you do |
|---|---|
| Anywhere, every day | One small puzzle about a city |
| Out in a covered city | Wayposts, Corrupted Capsules, public capsules (as today) |
| On a trip | City Hunts and Landmarks, in a city you already know a little |

The daily puzzle pays out wax balls, which only matter outdoors. So the sofa game points at the map.

Two things stay separate, at Roy's request:
- **Puzzle games** (guess the price, jigsaw, later word guess and guess the place). This document.
- **Collecting stickers.** Not designed yet. Corrupted Capsules drop nothing new for now.

## Build order
1. **City Explorer plus Guess the price** (this document, Part A and B).
2. **Jigsaw lock on public capsules** (Part C, rules agreed, screens designed when phase 1 is live).
3. Later: photo uploads for the jigsaw, more puzzle types, stickers.

## Part A: City Explorer

### What was borrowed from Metro Master
Roy's reference is the Metro Master city picker. Borrowed, and nothing else:
- Swipeable city cards at the bottom of a full-screen map.
- The map flies to the city as the cards are swiped.
- One big button under the card that changes with the city's state.

Not borrowed: its colours, type and ticket-shaped buttons (ours stay in the Time Capsule look), the Stats and Settings buttons, and the country dropdown. We have one city per country today, so the cards alone are enough. A country chip can be added when one country has several cities.

### Entry
- Journey gets a **city chip** at the top left showing the city you are in, for example 「台北 ▾」. Tapping it opens the Explorer.
- If you are outside every covered city, Journey opens straight into the Explorer, so there is never an empty map.

### The Explorer
- The map stays full screen. The bottom row (Passport · Quest · Cabinet) and the Drop button are replaced by the city cards while the Explorer is open.
- **Top bar:** a round back button (returns to your real location), the title 探索城市 / Explore cities, and your wax ball count.
- **City cards**, one per city, swiped sideways. The map flies to the city of the centred card.
- **A playable city's card** shows the city name, what it is known for, its Landmark, today's puzzle state and your streak.
- **A coming-soon city's card** is faded with 即將開放 / Coming soon. These are the six cities we already have map tiles for: Tokyo, Kyoto, Seoul, Bangkok, Beijing and Kuala Lumpur.
- **The button under the card:**

| City state | Button |
|---|---|
| Today's puzzle not played | 玩今天的謎題 / Play today's puzzle (ink blue) |
| Played | 看結果 / See result (outlined), with "new puzzle tomorrow" on the card |
| Coming soon | 即將開放 / Coming soon (disabled) |

### Looking at a city you are not in
- You see its Landmarks and Wayposts. Tapping one shows its name card only.
- You cannot spin, throw, fight or pick anything up. Those stay tied to being there, and the server already refuses them.
- Corrupted Capsules and public capsules are not shown. They are found by walking.
- Your own place-locked private capsules show as they do today.

## Part B: Guess the price (猜價)

The reference is Costcodle: a picture, guess the price, "higher" or "lower", six tries. Wordle supplies the daily rhythm and the shareable result.

### Rules
- Each playable city has **one puzzle a day, the same for everyone**. All four cities are in the same time zone, so every puzzle changes at 00:00 Taipei time.
- The puzzle shows a picture and a question such as 「在台北，一杯珍珠奶茶大概多少錢？」.
- **You guess in US dollars** (Roy, 2026-11-17). A player from Singapore may not know what Indonesian or Taiwanese money is worth, so one reference currency works for every city. Each guess is also shown in the city's own money (`US$ 2 ≈ NT$ 64`), and the puzzle shows the rate (`US$ 1 ≈ NT$ 32`), so you learn the local money as you play.
- You have **six guesses**. After each one you see ↑ higher or ↓ lower, plus 很接近 / Close when you are within 25%.
- You win when your guess is **within 10%** of the answer in US dollars. Prices are "typical" prices, so an exact match would be unfair.
- Win or lose, the result shows the price in US dollars and local money, one line about the item, and where the price came from with the date it was checked.
- No retries. Tomorrow has a new one.

### Rewards
- Solved: 3 wax balls. Not solved: 1 wax ball. The numbers live in the server's game settings.
- **Streak:** the number of days in a row you played at least one city's puzzle. It is shown on the card. There is no penalty screen when it breaks.
- No new currency.
- **Share:** a text result in the Wordle style, with no spoilers:

```
時光膠囊 猜價 · 台北 #12 · 3/6
⬆️⬇️✅
```

### Content
- About 30 questions per city to start, repeating in order when they run out.
- Things the city is known for: food, a tram or ferry fare, a market snack, a souvenir. Where we already have the vessel art (bubble tea, egg tart, pineapple bun, pineapple cake, tram) the question uses it.
- Each question stores: city, question in Chinese and English, picture, typical local price, currency, the US dollar rate on the day it was checked, one-line fact in both languages, source and the date checked. The US dollar answer is the local price divided by that stored rate, so it never drifts with live exchange rates.
- Prices must come from a checkable source, never from memory or a guess. A question with no source is not published.
- Pictures follow `design/art/STYLE.md`. No AI imitation photos of real places.

### What the server does
The answer never reaches the phone before the puzzle is finished. The app's side of this contract is `mobile/src/services/cityPuzzle.ts`.
- **`city_puzzle_today()`** returns `{ puzzles, streak }`. Each puzzle has `city`, `no`, `question_zh`, `question_en`, `vessel` (the picture), `currency`, `rate`, `guesses` (each `{ usd, hint, close }`), `done`, `won`, `answer` and `reward`. `answer` and `reward` are null until the puzzle is finished.
- **`city_puzzle_guess(p_city, p_usd)`** records one guess and returns `{ puzzle, streak, state }`. `hint` is `higher`, `lower` or `solved`. On a solve or the sixth guess it fills `answer` (`usd`, `local`, `fact_zh`, `fact_en`, `source`, `checked_on`) and `reward`, pays the wax balls once, and returns the player's game state. Errors: `already_done`, `bad_guess`.
- Streak and results are stored per player per day.
- **Later:** a read-only city view that returns a city's Wayposts for the Explorer map without needing your location to be there. Until then the Explorer shows the map and its Landmark buildings only.

### What is built (2026-11-17)
- `mobile/src/features/explorer/`: the city cards over the Journey map and the Guess the price screen.
- Journey has the city chip, opens on the Explorer when you are outside every covered city, and offers the Explorer on the location screen, so it works with location off.
- The map has a `city` command that flies to a city and sits above its Landmark.
- `CITY_PUZZLE_BACKEND` is off. Development builds play four sample questions kept in memory; production builds hide the whole feature until the backend is on.

## Part C: Jigsaw lock on public capsules (phase 2)
Rules agreed with Roy on 2026-11-17. Screens come later.
- A public capsule has a **jigsaw lock by default**. Arriving within 100 m gets you a try, and **the first person to solve it wins the capsule**.
- **Retry as often as you like**, with no wait.
- If someone else solves it while you are trying, you see a kind "someone got there first" message.
- The picture is **ours by default** (the illustrated scene for that kind of place). The sender does nothing to get it.
- **Uploading your own photo comes later.** A stranger sees that photo, and public capsules are still text-only until Roy decides how photos are moderated.
- Proposed sizes, growing with the wait: 1 day 3×3, 7 days 3×4, 30 days 4×4, 365 days 4×5. Square tiles that swap places, not interlocking shapes.
- Hunts already have a puzzle quest, so the jigsaw can be offered there later as one more puzzle type.

## Not in this plan
Stickers and albums, word guess, guess the place, voting for the next city, paid extras, and any change to Corrupted Capsules.

## Still open
Roy approved the demo on 2026-11-17 with these defaults in it: 3 wax balls for a solve and 1 for a miss, a 10% winning margin, and the six coming-soon cities shown. The jigsaw sizes in Part C are confirmed when phase 2 is designed.
