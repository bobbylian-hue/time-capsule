# Regional vessels and Landmarks: plan

Status: **proposal, waiting for Roy's picks** (2026-11-15). Nothing is drawn yet. Every new vessel follows [design/art/STYLE.md](../../design/art/STYLE.md) and [design/art/VESSEL-SOP.md](../../design/art/VESSEL-SOP.md); every new monument follows [docs/sop/landmark-monument.md](../sop/landmark-monument.md).

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
- **A local object people already have feelings about**, souvenir-style, our own design. No real brands or trade dress, no logos, no text, no flags, no official emblems (the Bauhinia, national crests, the Merlion as a mark).
- **No sacred objects as containers.** No temples, altars, deities or ritual objects (fortune sticks, incense burners).
- **Before drawing, Codex inspects the reference** listed for each item and records it in the art README (AGENTS.md rule). The references below are where to start; Codex picks a clear photo there and names the exact file it used.
- **Palette**: the style block's palette. The approved food exception (egg yellow, salmon, carrot orange, leafy green, rice white, tea brown, food inside food vessels only) covers pineapple cake, pineapple bun and egg tart. Anything else that needs a colour outside the palette is listed under Roy's decisions.

Rejected on purpose:

| Idea | Why not |
|---|---|
| Retro electric rice cooker | The well-known Taiwanese red cooker is protected trade dress |
| Mahjong tile box | Tiles carry characters (text); gambling flavour |
| Temple fortune-stick cylinder, incense coil | Sacred objects as containers |
| Star Ferry, Macau Tower, Marina Bay Sands, Peak Tower | Brand names / commercial landmarks owned by companies |
| Golden Bauhinia, Chiang Kai-shek / Sun Yat-sen memorial halls | Official emblem; politically charged |
| Supertree Grove | Owned attraction with its own marks; offered below only as an optional Landmark |

## 1. New regional vessels (12)

Ids are proposals; the id becomes the `vessels` row id and the file names (`vessel-<id>.png`). Tiers follow the existing price bands (common ≈ MOP 12, uncommon ≈ 16–18, rare ≈ 22–26). Opening codes are from the SOP: A hinge, B lift-off, C cap lift, E flap, F slide, J door, K pop-up.

| id | 中文 / English | Region | Tier | Motif | Reference to inspect | Opens (parts) | Idle | Notes |
|---|---|---|---|---|---|---|---|---|
| `pineapple-cake` ★ | 鳳梨酥禮盒 / Pineapple-cake box | Taiwan | Common | A paper gift sleeve with a slide-out tray of square golden pastries, the classic Taipei souvenir | [Wikipedia: Pineapple cake](https://en.wikipedia.org/wiki/Pineapple_cake) (lead image `Taiwanese_Pineapple_Cake_001.jpg`) | **F**: the tray slides out of the sleeve, the letter lies on top (sleeve, tray) | Breathe, sparkle on a brass seal sticker | Food exception (egg yellow, tea brown) for the pastries only; sleeve in cream and ink blue, no lettering |
| `tea-tin` | 高山茶罐 / High-mountain tea tin | Taiwan | Uncommon | Round brass-and-blue oolong canister with a push-on lid and a loose tea-leaf sprig | [Wikipedia: Taiwanese tea culture](https://en.wikipedia.org/wiki/Taiwanese_tea_culture), [Oolong](https://en.wikipedia.org/wiki/Oolong) | **B**: the lid lifts (tin, lid, steam) | Steam drifts | Tea leaves are leafy green (food exception covers tea) |
| `sky-lantern` | 平溪天燈 / Pingxi sky lantern | Taiwan | Rare | Tall cream paper lantern on a bamboo ring, warm light inside | [Wikipedia: Pingxi District](https://en.wikipedia.org/wiki/Pingxi_District), [Sky lantern](https://en.wikipedia.org/wiki/Sky_lantern) | **B**: the paper lantern rises off its bamboo ring, the letter sits on the ring (ring, paper, glow) | Glow flickers, slow bob | No written wishes on the paper (no text). Plain cream paper, never a flag or religious symbol (the Wikipedia lead image shows a flag; use another photo) |
| `rwb-bag` ★ | 紅白藍袋 / Red-white-blue bag | Hong Kong | Common | The striped nylon-canvas carry-all every Hong Kong family owns, zipped shut | zh.wikipedia [紅白藍](https://zh.wikipedia.org/wiki/紅白藍); Commons [Category:Red White and Blue Nylon canvas](https://commons.wikimedia.org/wiki/Category:Red_White_and_Blue_Nylon_canvas) | **K**: the zip pull fades, the letter pops up from the open top (bag, zip, letter) | Gentle sway | Wax red, paper, ink blue stripes: already in the palette. Plain generic bag, never a luxury-brand version |
| `bolo-box` | 菠蘿包麵包盒 / Bakery box with pineapple buns | Hong Kong | Uncommon | A cha chaan teng bakery box, string-tied, crackly-topped buns inside | [Wikipedia: Pineapple bun](https://en.wikipedia.org/wiki/Pineapple_bun) | The string fades, then **B**: the lid lifts (box, string, lid) | Steam drifts | Food exception for the buns; box in cream with wax-red string |
| `tram` | 叮叮電車 / Ding-ding tram tin | Hong Kong | Rare | A tin toy double-decker tram, loosely inspired by Hong Kong's trams | [Wikipedia: Hong Kong Tramways](https://en.wikipedia.org/wiki/Hong_Kong_Tramways) | **B**: the upper deck's roof lifts (tram, roof) | Bob, a small bell tick | No advertising livery, route number, fleet number or company name. Colour needs Roy (see decisions) |
| `tiffin` ★ | 錫格飯盒 / Tingkat tiffin carrier | Singapore | Common | Stacked enamel food carrier with brass side clips and handle, the Singapore family lunch | [Wikipedia: Tiffin carrier](https://en.wikipedia.org/wiki/Tiffin_carrier) (look for a Peranakan or Straits enamel tingkat, not the Indian dabba in the lead image) | **B**: the top tier lifts by its handle (stack, top) | Steam drifts | Enamel in ink blue / glass blue / paper with a simple flower band, brass clips |
| `kamcheng` | 娘惹金正瓷罐 / Peranakan kamcheng jar | Singapore | Uncommon | Round lidded Peranakan porcelain jar with a knob lid and a phoenix-and-peony band | Commons [Category:Kamcheng](https://commons.wikimedia.org/wiki/Category:Kamcheng); [Peranakan Museum](https://en.wikipedia.org/wiki/Peranakan_Museum) | **B**: the lid lifts (jar, lid) | Sparkle on the brass knob | Real kamcheng are pink and green; draw it in ink blue, glass blue and brass so no exception is needed (decision below) |
| `shophouse` | 南洋店屋盒 / Shophouse box | Singapore | Rare | A two-storey Straits shophouse front with shutters and pintu pagar half-doors | [Wikipedia: Shophouse](https://en.wikipedia.org/wiki/Shophouse); Koon Seng Road terraces (OSM node 5018207223) | **J**: the half-doors swing open, the letter waits in the doorway (house, left door, right door as a split) | Shutter peek, glow in the window | No shop signs, house numbers or lettering |
| `egg-tart` ★ | 葡撻盒 / Egg-tart box | Macau | Common | A paper bakery box of caramel-topped Portuguese egg tarts | [Wikipedia: Pastel de nata](https://en.wikipedia.org/wiki/Pastel_de_nata) and its Macau section | **B**: the lid lifts (box, lid, steam) | Steam drifts | Food exception for the tarts; no bakery branding (both the Lisbon and the Coloane bakeries are brands) |
| `azulejo-box` | 葡式花磚盒 / Azulejo tile box | Macau | Uncommon | A small wooden box faced with blue-and-white Portuguese tiles, like Macau's street-name tiles but with patterns only | [Wikipedia: Azulejo](https://en.wikipedia.org/wiki/Azulejo) | **A**: the lid hinges (box, lid) | Glint | Patterns only, never street-name lettering |
| `pedicab` | 澳門三輪車 / Macau pedicab | Macau | Rare | The tourist tricycle rickshaw with a fold-back canopy, waiting outside the old hotels | [Wikipedia: Cycle rickshaw](https://en.wikipedia.org/wiki/Cycle_rickshaw) (find a Macau photo on Commons; the lead image is Bangladeshi) | **A**: the canopy folds back on its hinge, the letter rests on the seat (cab, canopy) | Wheel tick, small bob | Canopy wax red with brass trim |

★ = batch 1.

### Proposed regional pools after the art lands
Two per tier per region. The admin page can change any of these; this is only the starting point.

| Region | Common | Uncommon | Rare | Earned (Landmarks) |
|---|---|---|---|---|
| Taiwan | bubble-tea, **pineapple-cake** | bento, **tea-tin** | hot-air-balloon, **sky-lantern** | bamboo-tower, *north-gate* |
| Hong Kong | dim-sum-steamer, **rwb-bag** | postbox, **bolo-box** | phone-booth, **tram** | clock-tower, red-bird |
| Singapore | lucky-stars, **tiffin** | mixtape, **kamcheng** | instant-camera, **shophouse** | lionfish-fountain, *durian-dome* |
| Macau | candy-box, **egg-tart** | musicbox, **azulejo-box** | pocket-watch, **pedicab** | senado-fountain, *lighthouse* |

Existing vessels that also fit a region and could be offered on the admin page: pager and mooncake-tin (Hong Kong), lucky-cat and red-packet (all four), lantern (Mid-Autumn, all four). Singapore's mixtape and instant camera are not local; once the new art is live Roy may want to drop them from Singapore's pool.

## 2. Landmarks

| Place id | Landmark | Region | Coordinates (OSM) | Tiles | Status | Earned vessel | Stamp |
|---|---|---|---|---|---|---|---|
| `taipei101` | Taipei 101 | Taiwan | live | ✅ | **Done** | bamboo-tower | ✅ |
| `beimen` | 台北府城北門 / Taipei North Gate (Qing city gate, 1884) | Taiwan | 25.0477291, 121.5112235 (way 238316480) | ✅ (150 m inside the west edge) | **Proposed** | `north-gate` | new |
| `red-house` | 西門紅樓 / Ximen Red House (octagonal 1908 market hall) | Taiwan | 25.0421376, 121.5062818 (way 222080307) | ❌ needs a tile extension | **Optional** | `red-house` | new |
| `tst-clock` | 尖沙咀鐘樓 / TST Clock Tower | Hong Kong | 22.2935926, 114.1695378 (way 37664321) | ✅ | **Upgrade**: add Landmark Waypost + monument | clock-tower (exists) | ✅ |
| `hkust` | HKUST | Hong Kong | live | ✅ | **Done** | red-bird | ✅ |
| `merlion` | Merlion Park | Singapore | live | ✅ | **Upgrade**: add monument | lionfish-fountain (exists) | ✅ |
| `esplanade` | 濱海藝術中心 / Esplanade (the "durian" domes) | Singapore | 1.2896438, 103.8559542 (way 97582570) | ✅ | **Proposed** | `durian-dome` | new |
| `supertrees` | 擎天樹叢 / Supertree Grove | Singapore | 1.2819993, 103.8639356 (way 171979084) | ✅ | **Optional** (owned attraction, see rules) | — | — |
| `senado` | Senado Square | Macau | live | ✅ | **Done** | senado-fountain | ✅ |
| `guia` | 東望洋燈塔 / Guia Lighthouse | Macau | 22.1964359, 113.5497062 (way 230576208) | ✅ | **Proposed** | `lighthouse` | new |
| `st-paul` | 大三巴牌坊 / Ruins of St Paul's | Macau | 22.1975219, 113.5412582 (way 1001795464) | ✅ | **Needs Roy** (Catholic heritage façade) | `stone-facade` | new |

Notes:
- **St Paul's** is Macau's most famous sight, but it is a church façade with saints' statues, and Guia Lighthouse sits next to a chapel. Our sacred-site rule says no boss on the grounds. Proposal: the fight point stays on the public stairs/square below (Company of Jesus Square), the vessel uses only the stepped stone silhouette and stairway, with no statues, crosses or figures. If Roy prefers to avoid it, Guia + Senado cover Macau.
- **Esplanade, Merlion, Supertree Grove** are well-known marks. Their vessels stay loosely inspired and **earned only, never sold** (same rule as Taipei 101 and the Merlion today).
- **Taiwan alternatives** if Roy wants a second Taipei Landmark inside today's tiles without politics or temples: Taipei North Gate is the only strong one; the Red House needs the Taipei tile box extended west to about lng 121.500 (a separate Codex task, same Protomaps build).
- Each new Landmark is four separate pieces of work: the `places` row + Landmark Waypost (Codex, data-only migration), the monument (Codex, `landmark-monument.md`), the earned vessel (art batch R3, then wiring), and the Passport stamp (art batch R3).

### New earned Landmark vessels (batch R3, after Roy picks Landmarks)

| id | 中文 / English | Place | Motif | Reference | Opens | Idle |
|---|---|---|---|---|---|---|
| `north-gate` | 北門城樓盒 / North Gate box | `beimen` | The gate's squat stone base with its arched passage and single-eaved tiled roof | [Wikipedia: Taipei North Gate](https://en.wikipedia.org/wiki/Taipei_North_Gate) (`North_Side_of_Taipei_City_North_Gate_20221122.jpg`) | **B**: the roof lifts, the letter waits in the archway (base, roof) | Sparkle on the roof ridge |
| `red-house` | 紅樓八角盒 / Red House octagon box | `red-house` | Red-brick octagonal hall with a white-banded drum and small cupola | [Wikipedia: Red House Theater](https://en.wikipedia.org/wiki/Red_House_Theater) | **C**: the cupola lifts (hall, cupola) | Glint on the cupola |
| `durian-dome` | 榴槤穹頂盒 / Durian-dome box | `esplanade` | Two spiky shaded domes side by side, as a pair of nesting boxes | [Wikipedia: Esplanade – Theatres on the Bay](https://en.wikipedia.org/wiki/Esplanade_%E2%80%93_Theatres_on_the_Bay) | **B**: the larger dome lifts (base, dome) | Breathe, glint on the spikes |
| `lighthouse` | 東望洋燈塔 / Guia lighthouse | `guia` | The short white lighthouse tower with its lantern room on top | [Wikipedia: Guia Fortress](https://en.wikipedia.org/wiki/Guia_Fortress) | **C**: the lantern-room cap lifts (tower, cap, beam glow) | Beam glow sweeps (glow) |
| `stone-facade` | 石牌坊盒 / Stone façade box | `st-paul` | The stepped granite façade and its grand stairway, silhouette only | [Wikipedia: Ruins of Saint Paul's](https://en.wikipedia.org/wiki/Ruins_of_Saint_Paul%27s) | **J**: the central door swings open (façade, door) | Glint |

Stamps: one round single-colour stamp per new place, `stamps/stamp-<placeId>.png`, following STYLE.md (no lettering), motif the same landmark.

## 3. Batch order

| Batch | Contents | Gate |
|---|---|---|
| **R1** (test) | `pineapple-cake` first as the test vessel, then `rwb-bag`, `tiffin`, `egg-tart` (one common per region) | Roy approves the test vessel's layers/motion sheet before the other three; Roy approves the PR before merge |
| **R2** | The 8 uncommon and rare vessels: `tea-tin`, `sky-lantern`, `bolo-box`, `tram`, `kamcheng`, `shophouse`, `azulejo-box`, `pedicab` | After R1 merges; no new test stop unless a check fails |
| **R3** | Earned vessels + stamps for the Landmarks Roy picks (`north-gate`, `durian-dome`, `lighthouse`, optional `red-house`, `stone-facade`) | After Roy picks Landmarks; first vessel is the test stop |
| **W** (wiring) | Catalogue rows, spawn-rule region/tier tags, i18n, `VesselKind` and `vesselParts` for each merged art batch | Held until that batch's art is approved and merged |
| **L** (Landmarks) | `places` + Landmark Waypost per picked Landmark; monuments for TST, Merlion and each new one | Separate Codex tasks; each monument needs Roy's screenshot OK |

R1 reuses only opening types that already exist (F, K, B), so it needs no new motion code.

## 4. Catalogue tags for the admin page
The data the admin page needs already exists; new vessels only add rows to it:

- **Tier and region live in `private.vessel_spawn_rules`**: `rarity` (common/uncommon/rare) and `regions text[]` (checked against Taiwan, Hong Kong, Singapore, Macau), plus the optional `habitat`, hour and date windows. Each new ordinary vessel gets a row with its tier and **an empty `regions` array** at wiring time, so it never spawns until Roy turns it on in the admin page (or the wiring PR applies the proposed pools above, if Roy says so).
- **Earned vessels never get a spawn rule.** They are tagged by `vessels.earned_place`; their region is the place's city (Taipei → Taiwan, as `private.resolve_spawn` already maps it). The admin page should show them read-only.
- **Two vessels per tier per region is new.** Today each region has exactly one per tier. The wiring task must check that `private.resolve_spawn` picks fairly among several rows of the chosen tier, and decide what happens if the admin page leaves a tier empty in a region (fall back to the next tier, rather than spawning nothing).
- Every vessel keeps its normal `vessels` row (`price_mop`, `sort`, `brand`/`edition_total` null). Proposed sort order: 69–80 for R1+R2 in the table order, then R3.

Coordination: the Waypost coverage plan is a separate session. Landmark Waypost rows for the new places are listed in section 2 with their OSM ids; whichever plan lands second should check the other's doc before seeding.

## Decisions for Roy
1. **Vessel picks**: approve the 12 regional vessels, or swap any (section 1).
2. **Batch 1**: approve R1 (pineapple-cake as the test vessel, then rwb-bag, tiffin, egg-tart).
3. **Landmarks**: which to add: Taipei North Gate, Esplanade, Guia Lighthouse (recommended); Ximen Red House (needs a tile extension); Ruins of St Paul's (religious heritage, with the care rule above); Supertree Grove (owned attraction). Also: add the missing Landmark Waypost for the TST Clock Tower and monuments for TST and the Merlion?
4. **Colours**: the tram's real green is outside our palette. Draw it in navy and cream (no exception), or approve a muted tram green as a palette exception? Kamcheng is planned in palette blues (no exception).
5. **Pools**: when a batch is wired, should new vessels start switched off (empty `regions`, Roy turns them on in the admin page) or with the proposed pools above?

## Appendix: Codex prompts

### RV-R1: regional art batch 1 (send after Roy approves R1)

```
Repository: royai202600-cyber/time-capsule (GitHub). Task RV-R1: regional vessel art, batch 1. ART ONLY.

Read first, in the repo: AGENTS.md (glossary, roles, Decisions log), design/art/STYLE.md and design/art/VESSEL-SOP.md (both mandatory), docs/design/regional-vessels.md (sections 1 and 3 are the spec for this task).

Setup: from the latest main, create your own Git worktree on a new branch codex/vessels-regional-1. Use an isolated temporary environment for the art tools (Pillow etc.); do not change app dependencies.

Vessels, in this order (ids, names, motifs, references, openings and idles are in the regional-vessels table):
1. pineapple-cake (鳳梨酥禮盒 / Pineapple-cake box), Taiwan, common: F slide, tray slides out of the sleeve. THIS IS THE TEST VESSEL.
2. rwb-bag (紅白藍袋 / Red-white-blue bag), Hong Kong, common: zip fades, K pop-up letter.
3. tiffin (錫格飯盒 / Tingkat tiffin carrier), Singapore, common: B, top tier lifts by its handle.
4. egg-tart (葡撻盒 / Egg-tart box), Macau, common: B, lid lifts, steam.

Rules:
- Model gpt-image-2 only, through your built-in image tool (no API key). If it is unavailable, stop and tell Roy; never fall back to another model.
- Every call: design/art/style-sheet.png as the reference and the STYLE.md section 2 style block pasted unchanged. State separately: Roy's approved food-colour exception (egg yellow, salmon, carrot orange, leafy green, rice white, tea brown) applies only to the food inside pineapple-cake, tiffin and egg-tart. Everything else stays in the palette.
- Before drawing each vessel, inspect a real reference photo of the object (start from the link in the table; for tiffin find a Straits/Peranakan enamel tingkat, not the Indian dabba). Record the exact file/URL in design/art/README.md.
- Original designs: no text, lettering, logos, brand shapes or bakery branding, no flags or emblems. The red-white-blue bag is the plain generic striped bag, never a luxury-brand version.
- Follow VESSEL-SOP exactly: one 1024 canvas per vessel, assembled image closed, parts edited from the assembled image at the same position/scale, base at y 880–920, at most 760 px wide, 100 px clear above. Revealed insides drawn completely (the tray under the sleeve, the bag's open top, the tiffin's inner tier with food, the tart box interior). Each resting pose equals the layers' open keyframe at at:0. Drift only on loose-particle layers (steam). No ground layers.
- Manifest vessel block per SOP section 8, using the IllustratedParts field names: layers bottom to top, roles, pivots, measured open keyframes, idleMs 3400–4600, idle motions sized per SOP section 5, mouth, baseY, sparkle.
- Checks per STYLE.md section 4 and SOP section 7: transparent corners, check-vessels.py stack (exact), 40 px and 120 px silhouettes, motion overlay (closed / half / fully open with pivots, mouth and sparkle marked), IP check. Fix small issues with scripts, not by regenerating. Downscale a vessel's parts together, never upscale.
- Export WebP with scripts/export-webp.cjs, update manifest.json (build-manifest.py), the README table and the contact sheet. Existing art files must stay byte-identical; prove it with a hash comparison in the report.

STOP POINT: finish pineapple-cake completely (all layers, manifest block, exports, checks, motion overlay), commit, push the branch and open a DRAFT PR to main with the motion overlay and 40/120 px sheets in the description. Then stop and report; wait for Roy's OK on the test vessel before drawing the other three. After his OK, do rwb-bag, tiffin and egg-tart without further stops unless a check fails or a decision is needed (IP, palette exception, design choice). Push at every review stop. When all four are done, update the PR and wait for Roy's approval of the whole PR before marking it ready; only then merge through the owner account after green CI, refreshing from main first if needed while keeping the approved art byte-identical.

Do NOT: change anything under mobile/, add vessels rows or spawn rules, write or apply a migration, change i18n, or deploy. Wiring is a separate held task (RV-W).

Update docs/TASKS.md (RV-R1 status) and add a Decisions-log line in AGENTS.md for anything Roy decides.

End with the standard report: 1) what changed (files, migrations, settings), 2) how it was tested (commands, checks, what you inspected), 3) what is live (deployed URL/version, migrations applied: expected none), 4) anything not done, risky, or needing Roy's decision, 5) the PR / commit hashes.
```

### RV-W: wiring and catalogue (outline, HELD until a batch's art is merged)

```
Repository: royai202600-cyber/time-capsule (GitHub). Task RV-W: wire regional vessel batch <R1|R2|R3>. HELD: start only after Roy confirms that batch's art PR is merged.

Read: AGENTS.md, design/art/VESSEL-SOP.md section 9, docs/design/regional-vessels.md sections 1, 2 and 4, migrations 20261108180337 (vessel_spawn_rules) and 20261109025315 (regions + resolve_spawn).

Work on your own worktree, branch codex/regional-wiring-<n>:
1. App: add the ids to VesselKind (mobile/src/vesselArt.ts); add vesselParts entries copied from design/art/manifest.json (literal requires); add shop.vessel.<id> and shop.desc.<id> in 繁中 and English; generate the Crack A overlay for each new vessel with the existing overlay generator (no new artwork; existing overlays byte-identical).
2. Migration (held until the app is live): insert the vessels rows (price per tier band, sort from 69 in the doc's order, brand/edition null; earned vessels with earned_place and price 0) and one private.vessel_spawn_rules row per ordinary vessel with its rarity. regions: <empty array so Roy enables them in the admin page | the proposed pools in section 1>, as Roy decided. Earned vessels get no spawn rule. For R3, the places rows must already exist (RV-L).
3. Check private.resolve_spawn picks fairly when a region has several vessels in the chosen tier, and falls back to another tier instead of spawning nothing when a tier is empty in a region. Fix it in the same migration if not; keep the ten-minute finite waves, six-nearby target and all safety exclusions unchanged.
4. Order: PR → CI → owner-account squash merge → owner-authored release → confirm live → hosted rollback preflight → apply migration → regenerate types → real-JWT checks (spawn by region and tier, acquire/send/open for new vessels, earned refusal before winning) → 375 px zh/en Shop, Create step 3, Cabinet, Album, fight screen and map crack overlays for each new vessel, Reduce Motion.
5. Remove disposable fixtures. Update docs/TASKS.md and the AGENTS.md Decisions log.

End with the standard 5-part report.
```
