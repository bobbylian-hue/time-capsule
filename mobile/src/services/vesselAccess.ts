/** Pre-migration catalogues omit earned_place (and, before R2, earned_only); zero price never unlocks a reward. */
export type VesselAccess = { price_mop: number; earned_place?: string | null; earned_only?: boolean | null; brand?: string | null; edition_total?: number | null };
/** Earned at a Landmark: tied to a place, or (R2) earned anywhere a Landmark gives it, like the Landmark Keepsake. */
export const isEarnedVessel = (v: VesselAccess) => v.earned_place != null || v.earned_only === true;
export const canUseVessel = (v: VesselAccess, owned: boolean) => owned || (v.price_mop === 0 && !isEarnedVessel(v));
/** Once the game is on, the Shop sells only what can't be found: brand and numbered editions. */
export const showVesselInShop = (v: VesselAccess, owned: boolean, gameOn = false) =>
  gameOn ? !isEarnedVessel(v) && (v.brand != null || v.edition_total != null) : owned || !isEarnedVessel(v);

/** What every new player starts with once the collecting game is on; everything else is found. */
export const STARTER_VESSELS = ['dome', 'bottle', 'envelope', 'tin'];
/** Until the game ships, every free vessel still counts as yours, as it does today. */
export const isCollected = (v: VesselAccess & { id: string }, owned: boolean, gameOn: boolean) =>
  owned || (gameOn ? STARTER_VESSELS.includes(v.id) : canUseVessel(v, false));
