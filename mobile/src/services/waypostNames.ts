// Waypost names in the admin map builder (docs/design/map-builder.md).

/** Roy: two Wayposts may share a name, but a picked or suggested name already used in the city gets a number
 * (大安森林公園 2), the same number on both names. Returns the names unchanged when neither is taken. */
export function numberedNames(zh: string, en: string, taken: { zh: Set<string>; en: Set<string> }): { zh: string; en: string; n: number | null } {
  const used = (z: string, e: string) => (!!z && taken.zh.has(z)) || (!!e && taken.en.has(e));
  if (!used(zh, en)) return { zh, en, n: null };
  for (let n = 2; ; n++) {
    const z = zh ? `${zh} ${n}` : "", e = en ? `${en} ${n}` : "";
    if (!used(z, e)) return { zh: z, en: e, n };
  }
}
