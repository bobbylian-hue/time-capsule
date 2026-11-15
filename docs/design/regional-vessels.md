# Regional vessels and Landmarks: plan

Status: **plan updated 2026-11-15 after Roy's direction on what vessels should be** (below). Existing vessels stay exactly as they are; this applies to new art only. Every new vessel follows [design/art/STYLE.md](../../design/art/STYLE.md) and [design/art/VESSEL-SOP.md](../../design/art/VESSEL-SOP.md); every new monument follows [docs/sop/landmark-monument.md](../sop/landmark-monument.md).

## Why
Roy is building an admin page to choose by hand which Corrupted Capsules spawn where. Today each of the four regions has exactly three spawnable vessels (one per tier), and most of them are not local: Singapore's set is lucky stars, mixtape and instant camera. This plan gives each region **six local choices (two per tier)** plus **an earned Landmark vessel for each major Landmark**, so the admin page has real options and each city feels like itself.

## What exists today (2026-11-15)

**68 vessels** in `public.vessels` and `VesselKind` (`mobile/src/vesselArt.ts`):
- Original 7: dome, bottle, envelope, tin, lantern, musicbox, maison (brand).
- Batch 1: mixtape, instant-camera, ramen, fortune-cookie, red-packet, snow-globe, phone-booth, firefly-jar, hourglass, gashapon.
- Wave 2: vinyl, vhs, photo-strip, arcade, pager, rotary-phone, umbrella, love-padlock, lucky-stars, paper-plane, lucky-cat, mooncake-tin, cake-box, candy-box, chocolate-heart, stocking, pumpkin, rice-dumpling, wish-tag, river-lantern.
- B5/B6: hot-air-balloon, bubble-tea, dim-sum-steamer, bento, paper-cranes, heart-locket, suitcase, postbox, camp-lantern, treasure-chest, spellbook, escape-pod, crystal-ball, wishing-lamp, potion, pocket-watch, diploma-tube, baby-shoes, memorial-candle, rocket-tin.
- **Earned Landmark vessels (11)**, one per `places` row through `vessels.earned_place`: clock-tower (`tst-clock`), senado-fountain (`senado`), bamboo-tower (`taipei101`), lionfish-fountain (`merlion`), red-bird (`hkust`), plus gate-lantern, torii-scroll, palace-pavilion, golden-roof, gate-lacquer, twin-towers for the six places outside our four regions.

**Spawn pools** (`private.vessel_spawn_rules`, migration `20261109025315`): one row per ordinary vessel with `rarity` (common/uncommon/rare, set from price thirds), optional habitat/hour/date windows, and `regions text[]`. Only 12 rows have a region:

| Region | Common | Uncommon | Rare |
|---|---|---|---|
| Taiwan | bubble-tea | bento | hot-air-balloon |
| Hong Kong | dim-sum-steamer / postbox (one of them is common, one uncommon: both MOP 16, the live `rarity` column decides) | | phone-booth |
| Singapore | lucky-stars | mixtape | instant-camera |
| Macau | candy-box | musicbox | pocket-watch |

**Landmarks in our four regions**

| Place id | Landmark | Waypost (fight) | Monument | Earned vessel | Stamp |
|---|---|---|---|---|---|
| `taipei101` | Taipei 101 | ✅ | ✅ | bamboo-tower | ✅ |
| `senado` | Senado Square fountain | ✅ | ✅ | senado-fountain | ✅ |
| `hkust` | HKUST (Piazza + Red Bird) | ✅ | ✅ | red-bird | ✅ + hunt stamp |
| `merlion` | Merlion Park | ✅ | ❌ | lionfish-fountain | ✅ |
| `tst-clock` | Tsim Sha Tsui Clock Tower | ❌ (open-a-capsule only) | ❌ | clock-tower | ✅ |

Hunt stamps: `hunt-xinyi-2026-11`, `hunt-hkust-2026-11`. Senado's hunt has no stamp of its own yet.

**Map tiles** (`docs/design/public-sea-cities.geojson`): Taipei covers lng 121.5099–121.6158 only, so anything west of Beimen (Ximending, Dadaocheng, Wanhua) is off the map. Hong Kong, Macau and Singapore boxes cover every place proposed below.

## Rules for every new design
- **Draw the thing the place is known for, not its packaging (Roy, 2026-11-15).** Macau is famous for the egg tart, not for the box egg tarts come in, so the vessel is the egg tart. Don't limit vessels to boxes and tins: anything can be a time capsule (a pastry, a bird cage, a boat, a can, a lamp post). A box, tin or can is right when that container is itself what the place is known for (for example Portuguese sardine cans in Macau). Be creative, and vary the shapes so a region's set doesn't look alike at 40 px.
- **Fill the canvas.** Closed, the vessel fills about 70% of the canvas (at most 760 px wide, base at y 880–920) and reads clearly at 40 px. The first pineapple-cake box test was 512 × 230 px and read as a sliver.
- **A local object people already have feelings about**, souvenir-style, our own design. No real brands or trade dress, no logos, no text, no flags, no official emblems (the Bauhinia, national crests, the Merlion as a mark).
- **No sacred objects as containers.** No temples, altars, deities or ritual objects (fortune sticks, incense burners).
- **Before drawing, Codex inspects the reference** listed for each item and records it in the art README (AGENTS.md rule). The references below are where to start; Codex picks a clear photo there and names the exact file it used.
- **Palette**: the style block's palette. The approved muted natural food colours (egg yellow, salmon, carrot orange, leafy green, rice white, tea brown) were approved for food inside food vessels; Roy's 2026-11-15 instruction to draw the pineapple cake and egg tart themselves extends them to food that is the vessel (pineapple cake, pineapple bun, egg tart, durian). Leaves use the teal green already approved for the dome rose. Everything else stays in the palette.

Rejected on purpose:

| Idea | Why not |
|---|---|
| Retro electric rice cooker | The well-known Taiwanese red cooker is protected trade dress |
| Mahjong tile box | Tiles carry characters (text); gambling flavour |
| Temple fortune-stick cylinder, incense coil | Sacred objects as containers |
| Star Ferry, Macau Tower, Marina Bay Sands, Peak Tower | Brand names / commercial landmarks owned by companies |
| Golden Bauhinia, Chiang Kai-shek / Sun Yat-sen memorial halls | Official emblem; politically charged |
| Supertree Grove | Owned attraction with its own marks; offered below only as an optional Landmark |

## 1. New regional vessels: wave 1 (12)

Ids are proposals; the id becomes the `vessels` row id and the file names (`vessel-<id>.png`). Tiers follow the existing price bands (common ≈ MOP 12, uncommon ≈ 16–18, rare ≈ 22–26). Opening codes are from the SOP: A hinge, B lift-off, C cap lift, H split, K pop-up. The first vessel of each region is that batch's test vessel.

| id | 中文 / English | Region | Tier | Motif | Reference to inspect | Opens (parts) | Idle | Notes |
|---|---|---|---|---|---|---|---|---|
| `pineapple-cake` ★ | 鳳梨酥 / Pineapple cake | Taiwan | Common | One plump golden pineapple-cake pastry with a crumbly baked crust, no wrapper or box | [Wikipedia: Pineapple cake](https://en.wikipedia.org/wiki/Pineapple_cake) (`Taiwanese_Pineapple_Cake_001.jpg`) | **H**: the pastry breaks into two halves, showing the golden pineapple filling and a rolled letter in the middle (left, right, letter) | Small bob, sparkle on the crust | Draw it soft-cornered and textured so it reads as pastry, never as a block. Food colours |
| `teapot` | 台灣茶壺 / Oolong teapot | Taiwan | Uncommon | A small round clay teapot with a tiny cup beside it, the Taiwanese tea-table set | [Wikipedia: Taiwanese tea culture](https://en.wikipedia.org/wiki/Taiwanese_tea_culture) | **B**: the lid lifts, steam rises, the letter is rolled inside (pot, lid, steam) | Steam drifts | Warm brown clay (wood/earth tone, like wood) with a brass knob |
| `sky-lantern` | 平溪天燈 / Pingxi sky lantern | Taiwan | Rare | Tall cream paper lantern on a bamboo ring, warm light inside | [Wikipedia: Pingxi District](https://en.wikipedia.org/wiki/Pingxi_District), [Sky lantern](https://en.wikipedia.org/wiki/Sky_lantern) | **B**: the paper lantern rises off its bamboo ring, the letter sits on the ring (ring, paper, glow) | Glow flickers, slow bob | No written wishes (no text), never a flag or religious symbol (the Wikipedia lead image shows a flag; use another photo) |
| `rwb-bag` ★ | 紅白藍袋 / Red-white-blue bag | Hong Kong | Common | The striped nylon-canvas carry-all every Hong Kong family owns, zipped shut | zh.wikipedia [紅白藍](https://zh.wikipedia.org/wiki/紅白藍); Commons [Category:Red White and Blue Nylon canvas](https://commons.wikimedia.org/wiki/Category:Red_White_and_Blue_Nylon_canvas) | **K**: the zip pull fades, the letter pops up from the open top (bag, zip, letter) | Gentle sway | Wax red, paper and ink blue stripes are already in the palette. Plain generic bag, never a luxury-brand version |
| `bolo-bun` | 菠蘿油 / Pineapple bun with butter | Hong Kong | Uncommon | One crackly-topped cha chaan teng pineapple bun, no box | [Wikipedia: Pineapple bun](https://en.wikipedia.org/wiki/Pineapple_bun) | **A**: the top half opens on a back hinge like a 菠蘿油, the letter sits where the butter slab goes (bottom, top, letter) | Steam drifts | Food colours; a thin butter slab beside the letter |
| `tram` | 叮叮電車 / Ding-ding tram | Hong Kong | Rare | A Hong Kong double-decker tram as a tin toy: tall, narrow, boxy body in dark tram green, warm wood window frames on both decks, plain panels where the adverts go, a blank destination box on the flat roof, one round headlight, a front fender tray and a trolley pole (Roy's reference photo, 2026-11-15) | [Wikipedia: Hong Kong Tramways](https://en.wikipedia.org/wiki/Hong_Kong_Tramways) | **B**: the upper deck's roof lifts (tram, roof) | Bob, a small bell tick | Roy approved a palette exception (2026-11-15): muted Hong Kong tram green body with cream window bands and navy undercarriage; navy-and-cream read as a generic tram. No advertising livery, route or fleet number, or company name |
| `tiffin` ★ | 錫格飯盒 / Tingkat tiffin carrier | Singapore | Common | Stacked enamel food carrier with brass side clips and a handle, the Singapore family lunch | [Wikipedia: Tiffin carrier](https://en.wikipedia.org/wiki/Tiffin_carrier) (find a Straits/Peranakan enamel tingkat, not the Indian dabba in the lead image) | **B**: the top tier lifts by its handle (stack, top) | Steam drifts | Tall and round, enamel in ink blue / glass blue / paper with a simple flower band, brass clips |
| `kamcheng` | 娘惹金正瓷罐 / Peranakan kamcheng jar | Singapore | Uncommon | Round lidded Peranakan porcelain jar with a knob lid and a phoenix-and-peony band | Commons [Category:Kamcheng](https://commons.wikimedia.org/wiki/Category:Kamcheng); [Peranakan Museum](https://en.wikipedia.org/wiki/Peranakan_Museum) | **B**: the lid lifts (jar, lid) | Sparkle on the brass knob | Roy approved a palette exception (2026-11-15): muted Peranakan pink ground and jade-green band, with plum, wax red and brass; blue-and-white read as generic Chinese porcelain |
| `orchid` | 胡姬花 / Orchid bloom | Singapore | Rare | One orchid bud on its stem in a small glazed pot, opening into a flat-faced tropical orchid | [Wikipedia: Papilionanthe Miss Joaquim](https://en.wikipedia.org/wiki/Papilionanthe_Miss_Joaquim) | **H**: the petals unfold outward and the letter sits in the centre of the flower (pot, stem, left petals, right petals) | Gentle sway | Petals in plum tints, teal-green leaves; a flower, not an emblem |
| `egg-tart` ★ | 葡撻 / Egg tart | Macau | Common | One Portuguese egg tart with flaky pastry and a caramel-spotted top, sitting in its fluted foil cup | [Wikipedia: Pastel de nata](https://en.wikipedia.org/wiki/Pastel_de_nata) and its Macau section | **B**: the tart lifts out of its foil cup, the folded letter waits in the cup (cup, tart, steam) | Steam drifts | Food colours; foil in paper and glass-blue tones; no bakery branding (both the Lisbon and the Coloane bakeries are brands) |
| `rooster` | 葡國公雞 / Portuguese rooster | Macau | Uncommon | The painted ceramic folk rooster sold all over Macau, with a red comb and painted hearts and flowers | [Wikipedia: Rooster of Barcelos](https://en.wikipedia.org/wiki/Rooster_of_Barcelos) | **C**: the back and tail lift off as a lid (body, back) | Rocking sway | Body navy, comb wax red, painted motifs in brass, wax red and ink blue; no lettering |
| `pedicab` | 澳門三輪車 / Macau pedicab | Macau | Rare | The tourist tricycle rickshaw with a fold-back canopy | [Wikipedia: Cycle rickshaw](https://en.wikipedia.org/wiki/Cycle_rickshaw) (find a Macau photo on Commons; the lead image is Bangladeshi) | **A**: the canopy folds back on its hinge, the letter rests on the seat (cab, canopy) | Wheel tick, small bob | Canopy wax red with brass trim |

★ = test vessel of its region's batch.

Changed after Roy's direction (none of these were approved art): pineapple-cake box (now the pastry), egg-tart box (now the tart), tea tin (now the teapot), bakery box (now the bun), shophouse box (now the orchid), azulejo tile box (now the rooster).

### Wave 2: three more per region (12)

| id | 中文 / English | Region | Tier | Motif | Reference to inspect | Opens (parts) | Idle | Notes |
|---|---|---|---|---|---|---|---|---|
| `marble-soda` ★ | 彈珠汽水 / Marble soda | Taiwan | Common | The old-school glass soda bottle with a marble sealed in its pinched neck, from night markets and corner shops | [Wikipedia: Codd-neck bottle](https://en.wikipedia.org/wiki/Codd-neck_bottle) | **D**: the marble pops down, the cap lifts and the rolled letter slides up (bottle, cap, letter) | Bubbles drift | Generic glass bottle, no label or brand shape; glass alpha rule applies |
| `diabolo` | 扯鈴 / Diabolo | Taiwan | Uncommon | The two-cup spinning folk toy with its sticks and string, a Taiwanese school-fair favourite | [Wikipedia: Diabolo](https://en.wikipedia.org/wiki/Diabolo) | **H**: the two cups twist apart at the axle, the letter is rolled in the middle (left cup, right cup, letter) | Slow spin | Wax red and ink blue cups, wooden sticks |
| `blue-magpie` | 台灣藍鵲 / Formosan blue magpie | Taiwan | Rare | A ceramic figure of Taiwan's long-tailed blue magpie | [Wikipedia: Taiwan blue magpie](https://en.wikipedia.org/wiki/Taiwan_blue_magpie) | **C**: the back lifts off as a lid (body, back) | Tail sway | Ink and light blue body, wax-red beak and legs: all in palette |
| `egg-waffle` ★ | 雞蛋仔 / Egg waffle | Hong Kong | Common | A bubbly golden egg-waffle sheet rolled into a paper cone, the street snack | [Wikipedia: Egg waffle](https://en.wikipedia.org/wiki/Egg_waffle) | **K**: the letter pops up from the cone's mouth (cone, waffle, letter) | Steam drifts | Food colours; plain paper cone |
| `bird-cage` | 雀籠 / Songbird cage | Hong Kong | Uncommon | A round bamboo songbird cage like those on Yuen Po Street, empty, with a small porcelain water cup | [Wikipedia: Yuen Po Street Bird Garden](https://en.wikipedia.org/wiki/Yuen_Po_Street_Bird_Garden) | **J**: the little door swings open, the letter perches inside (cage, door) | Gentle sway on its hook | No live bird; warm bamboo wood |
| `junk-boat` | 紅帆船 / Red-sail junk | Hong Kong | Rare | A wooden junk with red battened sails on Victoria Harbour | [Wikipedia: Junk (ship)](https://en.wikipedia.org/wiki/Junk_(ship)) | **A**: the sails fold down on the mast hinge, the letter lies on deck (hull, sails) | Bob on water | Sails wax red; generic boat, not a named tour boat |
| `kopi-bag` ★ | 咖啡袋 / Kopi in a bag | Singapore | Common | Hawker-style iced kopi in a clear plastic bag tied with a string handle | [Wikipedia: Kopi](https://en.wikipedia.org/wiki/Kopi) | The string knot fades, then **K**: the letter pops up (bag, knot, letter) | Small sway, ice glint | Clear bag uses the glass alpha rule; tea-brown coffee (food colours) |
| `beaded-slipper` | 娘惹珠鞋 / Peranakan beaded slipper | Singapore | Uncommon | A kasut manek, the hand-beaded Peranakan slipper with a floral pattern | [Wikipedia: Peranakans](https://en.wikipedia.org/wiki/Peranakans) (find a kasut manek photo on Commons) | **F**: the letter slides out of the toe (slipper, letter) | Sparkle on the beads | Beads in palette colours, floral only |
| `bumboat` | 駁船 / River bumboat | Singapore | Rare | A wooden Singapore River bumboat with painted eyes on the bow and a canopy | [Wikipedia: Bumboat](https://en.wikipedia.org/wiki/Bumboat) | **B**: the canopy lifts (boat, canopy) | Bob on water | No operator names or numbers |
| `almond-cookie` ★ | 杏仁餅 / Almond cookies | Macau | Common | A short stack of round Macau almond cookies tied with a ribbon | [Wikipedia: Almond biscuit](https://en.wikipedia.org/wiki/Almond_biscuit) | The ribbon fades, then **B**: the top cookies lift off, the letter is in the hollow (stack, ribbon, top) | Breathe, crumb sparkle | Food colours; no shop branding |
| `sardine-can` | 葡國沙甸魚罐頭 / Portuguese sardine can | Macau | Uncommon | The colourful Portuguese sardine can sold in Macau's souvenir shops: here the can itself is the signature | [Wikipedia: Canned fish](https://en.wikipedia.org/wiki/Canned_fish) (find a Portuguese sardine tin on Commons) | **A**: the ring-pull lid rolls back, the letter lies among the sardines (can, lid) | Glint on the tin | Our own pattern, no brand label or lettering |
| `street-lamp` | 葡式街燈 / Portuguese street lamp | Macau | Rare | The black cast-iron lamp posts of Taipa Village and the old town | [Wikipedia: Taipa Village](https://en.wikipedia.org/wiki/Taipa_Village) | **C**: the lantern cap lifts, warm light spills out (post, lantern cap, glow) | Glow flickers | Navy iron, brass and warm glow |

★ = test vessel of its batch.

### Proposed regional pools after the art lands
With wave 1, two per tier per region; wave 2 adds a third per tier. The admin page can change any of these; this is only the starting point.

| Region | Common | Uncommon | Rare | Earned (Landmarks) |
|---|---|---|---|---|
| Taiwan | bubble-tea, **pineapple-cake** | bento, **teapot** | hot-air-balloon, **sky-lantern** | bamboo-tower, *north-gate* |
| Hong Kong | dim-sum-steamer, **rwb-bag** | postbox, **bolo-bun** | phone-booth, **tram** | clock-tower, red-bird |
| Singapore | lucky-stars, **tiffin** | mixtape, **kamcheng** | instant-camera, **orchid** | lionfish-fountain, *durian* |
| Macau | candy-box, **egg-tart** | musicbox, **rooster** | pocket-watch, **pedicab** | senado-fountain, *lighthouse* |

Existing vessels that also fit a region and could be offered on the admin page: pager and mooncake-tin (Hong Kong), lucky-cat and red-packet (all four), lantern (Mid-Autumn, all four). Singapore's mixtape and instant camera are not local; once the new art is live Roy may want to drop them from Singapore's pool. Several existing pool vessels are boxes (bento, candy-box); the admin page lets Roy prefer the new non-box ones.


## 2. Landmarks

| Place id | Landmark | Region | Coordinates (OSM) | Tiles | Status | Earned vessel | Stamp |
|---|---|---|---|---|---|---|---|
| `taipei101` | Taipei 101 | Taiwan | live | ✅ | **Done** | bamboo-tower | ✅ |
| `beimen` | 台北府城北門 / Taipei North Gate (Qing city gate, 1884) | Taiwan | 25.0477291, 121.5112235 (way 238316480) | ✅ (150 m inside the west edge) | **Proposed** | `north-gate` | new |
| `red-house` | 西門紅樓 / Ximen Red House (octagonal 1908 market hall) | Taiwan | 25.0421376, 121.5062818 (way 222080307) | ❌ needs a tile extension | **Optional** | `red-house` | new |
| `tst-clock` | 尖沙咀鐘樓 / TST Clock Tower | Hong Kong | 22.2935926, 114.1695378 (way 37664321) | ✅ | **Upgrade**: add Landmark Waypost + monument | clock-tower (exists) | ✅ |
| `hkust` | HKUST | Hong Kong | live | ✅ | **Done** | red-bird | ✅ |
| `merlion` | Merlion Park | Singapore | live | ✅ | **Upgrade**: add monument | lionfish-fountain (exists) | ✅ |
| `esplanade` | 濱海藝術中心 / Esplanade (the "durian" domes) | Singapore | 1.2896438, 103.8559542 (way 97582570) | ✅ | **Proposed** | `durian` | new |
| `supertrees` | 擎天樹叢 / Supertree Grove | Singapore | 1.2819993, 103.8639356 (way 171979084) | ✅ | **Optional** (owned attraction, see rules) | — | — |
| `senado` | Senado Square | Macau | live | ✅ | **Done** | senado-fountain | ✅ |
| `guia` | 東望洋燈塔 / Guia Lighthouse | Macau | 22.1964359, 113.5497062 (way 230576208) | ✅ | **Proposed** | `lighthouse` | new |
| `st-paul` | 大三巴牌坊 / Ruins of St Paul's | Macau | 22.1975219, 113.5412582 (way 1001795464) | ✅ | **Needs Roy** (Catholic heritage façade) | `stone-facade` | new |

Notes:
- **St Paul's** is Macau's most famous sight, but it is a church façade with saints' statues, and Guia Lighthouse sits next to a chapel. Our sacred-site rule says no boss on the grounds. Proposal: the fight point stays on the public stairs/square below (Company of Jesus Square), the vessel uses only the stepped stone silhouette and stairway, with no statues, crosses or figures. If Roy prefers to avoid it, Guia + Senado cover Macau.
- **Esplanade, Merlion, Supertree Grove** are well-known marks. Their vessels stay loosely inspired and **earned only, never sold** (same rule as Taipei 101 and the Merlion today).
- **Taiwan alternatives** if Roy wants a second Taipei Landmark inside today's tiles without politics or temples: Taipei North Gate is the only strong one; the Red House needs the Taipei tile box extended west to about lng 121.500 (a separate Codex task, same Protomaps build).
- Each new Landmark is four separate pieces of work: the `places` row + Landmark Waypost (Codex, data-only migration), the monument (Codex, `landmark-monument.md`), the earned vessel (art batch RV-L-art, then wiring), and the Passport stamp (RV-L-art).


### New earned Landmark vessels (batch RV-L-art, after Roy picks Landmarks)
Same rule: the object or a miniature of the landmark, never a box with the landmark on it.

| id | 中文 / English | Place | Motif | Reference | Opens | Idle |
|---|---|---|---|---|---|---|
| `north-gate` | 北門城樓 / Miniature North Gate | `beimen` | The gate's squat stone base with its arched passage and single-eaved tiled roof | [Wikipedia: Taipei North Gate](https://en.wikipedia.org/wiki/Taipei_North_Gate) (`North_Side_of_Taipei_City_North_Gate_20221122.jpg`) | **B**: the roof lifts, the letter waits in the archway (base, roof) | Sparkle on the roof ridge |
| `red-house` | 西門紅樓 / Miniature Red House | `red-house` | Red-brick octagonal hall with a white-banded drum and small cupola | [Wikipedia: Red House Theater](https://en.wikipedia.org/wiki/Red_House_Theater) | **C**: the cupola lifts (hall, cupola) | Glint on the cupola |
| `durian` | 榴槤 / Durian | `esplanade` | A whole spiky durian, the fruit the Esplanade's domes are nicknamed after | [Wikipedia: Esplanade – Theatres on the Bay](https://en.wikipedia.org/wiki/Esplanade_%E2%80%93_Theatres_on_the_Bay), [Durian](https://en.wikipedia.org/wiki/Durian) | **H**: the husk splits along its seams, the letter rests on the cream pods (left husk, right husk, pods) | Breathe, glint on the spikes |
| `lighthouse` | 東望洋燈塔 / Guia lighthouse | `guia` | The short white lighthouse tower with its lantern room on top | [Wikipedia: Guia Fortress](https://en.wikipedia.org/wiki/Guia_Fortress) | **C**: the lantern-room cap lifts (tower, cap, beam glow) | Beam glow sweeps (glow) |
| `stone-facade` | 大三巴牌坊 / Miniature stone façade | `st-paul` | The stepped granite façade and its grand stairway, silhouette only | [Wikipedia: Ruins of Saint Paul's](https://en.wikipedia.org/wiki/Ruins_of_Saint_Paul%27s) | **J**: the central door swings open (façade, door) | Glint |

Stamps: one round single-colour stamp per new place, `stamps/stamp-<placeId>.png`, following STYLE.md (no lettering), motif the same landmark.

## 3. Batch order: nine batches in parallel

Each batch is its own Codex session, branch and PR, so all of them can run at once. Each stops once, after its first vessel (★), for Roy's OK; then the rest follow without another stop unless a check fails.

| Batch | Branch | Vessels (test first) | Notes |
|---|---|---|---|
| **RV-TW** | `codex/vessels-regional-1` (draft PR #134, reused) | `pineapple-cake`, `teapot`, `sky-lantern`, plus `rwb-bag` and `tiffin` already drawn there | The pastry replaces the pineapple-cake box; the egg-tart box is removed (RV-MO owns `egg-tart`) |
| **RV-HK** | `codex/vessels-regional-hk` | `bolo-bun`, `tram` (`rwb-bag` is in #134) | |
| **RV-SG** | `codex/vessels-regional-sg` | `kamcheng`, `orchid` (`tiffin` is in #134) | |
| **RV-MO** | `codex/vessels-regional-mo` | `egg-tart`, `rooster`, `pedicab` | |
| **RV-TW2** | `codex/vessels-regional-tw2` | `marble-soda`, `diabolo`, `blue-magpie` | |
| **RV-HK2** | `codex/vessels-regional-hk2` | `egg-waffle`, `bird-cage`, `junk-boat` | |
| **RV-SG2** | `codex/vessels-regional-sg2` | `kopi-bag`, `beaded-slipper`, `bumboat` | |
| **RV-MO2** | `codex/vessels-regional-mo2` | `almond-cookie`, `sardine-can`, `street-lamp` | |
| **RV-L-art** | `codex/vessels-regional-landmarks` | `north-gate` (test), `durian`, `lighthouse` + stamps `beimen`, `esplanade`, `guia` | Art only; Landmark rows, Wayposts and monuments (RV-L) wait for Roy's Landmark picks |
| **RV-W** | per merged batch | Catalogue rows, spawn-rule tags, i18n, `VesselKind`, `vesselParts`, crack overlays | Held until that batch's art is merged |
| **RV-L** | later | `places` + Landmark Waypost per picked Landmark; monuments for TST, Merlion and new ones | Each monument needs Roy's screenshot OK |

**Parallel rules.** Each batch touches only its own vessel files plus the shared `manifest.json`, art README table, contact sheet, `docs/TASKS.md` and the Decisions log. PRs merge one at a time, in whatever order Roy approves them. Before merging, a later branch refreshes from main and re-adds its own entries to the shared files and regenerates the contact sheet, keeping every approved art file byte-identical. Every opening type used (A, B, C, D, F, H, J, K) already exists in the app, so no batch needs new motion code.


## 4. Catalogue tags for the admin page
The data the admin page needs already exists; new vessels only add rows to it:

- **Tier and region live in `private.vessel_spawn_rules`**: `rarity` (common/uncommon/rare) and `regions text[]` (checked against Taiwan, Hong Kong, Singapore, Macau), plus the optional `habitat`, hour and date windows. Each new ordinary vessel gets a row with its tier and **an empty `regions` array** at wiring time, so it never spawns until Roy turns it on in the admin page (or the wiring PR applies the proposed pools above, if Roy says so).
- **Earned vessels never get a spawn rule.** They are tagged by `vessels.earned_place`; their region is the place's city (Taipei → Taiwan, as `private.resolve_spawn` already maps it). The admin page should show them read-only.
- **Two vessels per tier per region is new.** Today each region has exactly one per tier. The wiring task must check that `private.resolve_spawn` picks fairly among several rows of the chosen tier, and decide what happens if the admin page leaves a tier empty in a region (fall back to the next tier, rather than spawning nothing).
- Every vessel keeps its normal `vessels` row (`price_mop`, `sort`, `brand`/`edition_total` null). Proposed sort order: 69 onward, in the order batches merge.

Coordination: the Waypost coverage plan is a separate session. Landmark Waypost rows for the new places are listed in section 2 with their OSM ids; whichever plan lands second should check the other's doc before seeding.


## Decisions for Roy
1. ~~**What a vessel is, parallel batches**~~: decided 2026-11-15 (the place's signature thing, not its packaging; existing vessels unchanged). Swap any vessel you don't like before Codex starts that batch.
2. **Landmarks**: which to add: Taipei North Gate, Esplanade, Guia Lighthouse (recommended); Ximen Red House (needs a tile extension); Ruins of St Paul's (religious heritage, with the care rule above); Supertree Grove (owned attraction). Also: add the missing Landmark Waypost for the TST Clock Tower and monuments for TST and the Merlion?
3. ~~**Tram colour**~~: muted tram green approved 2026-11-15.
4. **Pools**: when a batch is wired, should new vessels start switched off (empty `regions`, Roy turns them on in the admin page) or with the proposed pools above?

## Appendix: Codex prompts
The nine art prompts were handed to Roy in chat on 2026-11-15; each names its batch, branch and vessels and points to this doc. RV-W stays as outlined below.


### RV-W: wiring and catalogue (outline, HELD until a batch's art is merged)

```
Repository: royai202600-cyber/time-capsule (GitHub). Task RV-W: wire regional vessel batch <batch id, e.g. RV-TW>. HELD: start only after Roy confirms that batch's art PR is merged.

Read: AGENTS.md, design/art/VESSEL-SOP.md section 9, docs/design/regional-vessels.md sections 1, 2 and 4, migrations 20261108180337 (vessel_spawn_rules) and 20261109025315 (regions + resolve_spawn).

Work on your own worktree, branch codex/regional-wiring-<n>:
1. App: add the ids to VesselKind (mobile/src/vesselArt.ts); add vesselParts entries copied from design/art/manifest.json (literal requires); add shop.vessel.<id> and shop.desc.<id> in 繁中 and English; generate the Crack A overlay for each new vessel with the existing overlay generator (no new artwork; existing overlays byte-identical).
2. Migration (held until the app is live): insert the vessels rows (price per tier band, sort from 69 in the doc's order, brand/edition null; earned vessels with earned_place and price 0) and one private.vessel_spawn_rules row per ordinary vessel with its rarity. regions: <empty array so Roy enables them in the admin page | the proposed pools in section 1>, as Roy decided. Earned vessels get no spawn rule. For RV-L-art vessels, the places rows must already exist (RV-L).
3. Check private.resolve_spawn picks fairly when a region has several vessels in the chosen tier, and falls back to another tier instead of spawning nothing when a tier is empty in a region. Fix it in the same migration if not; keep the ten-minute finite waves, six-nearby target and all safety exclusions unchanged.
4. Order: PR → CI → owner-account squash merge → owner-authored release → confirm live → hosted rollback preflight → apply migration → regenerate types → real-JWT checks (spawn by region and tier, acquire/send/open for new vessels, earned refusal before winning) → 375 px zh/en Shop, Create step 3, Cabinet, Album, fight screen and map crack overlays for each new vessel, Reduce Motion. Confirm idle steam is actually visible on vessels whose steam layer rests at opacity 0 with a drift idle (egg-tart, bolo-bun, teapot); fix the data, not the art, if it isn't.
5. Remove disposable fixtures. Update docs/TASKS.md and the AGENTS.md Decisions log.

End with the standard 5-part report.
```
