// Waypost racks: every public capsule hangs on a Waypost's rack (docs/design/hunt-loop.md, "3. Waypost racks").
// The contract is Codex's HL-C1 backend. Until it ships, development builds use a sample rack that lasts
// until the page reloads; production keeps today's public capsules.
import { supabase } from "./supabase";

/** Codex's HL-C1 backend is live. Switch on when `waypost_rack`, `rack_leave` and `rack_open` are applied. */
export const RACK_BACKEND = false;
export const RACK_SAMPLE = !RACK_BACKEND && typeof __DEV__ !== "undefined" && __DEV__;
/** Racks replace floating public capsules (and the Drop a capsule pill) wherever this is on. */
export const RACKS = RACK_BACKEND || RACK_SAMPLE;

export const RACK_RADIUS_M = 100;
export type RackWait = 1 | 7 | 30 | 365;
export const RACK_PAGE = 30;
export const RACK_FILTERS = ["all", "ready", "waiting", "question", "friends", "mine"] as const;
export type RackFilter = (typeof RACK_FILTERS)[number];

export type RackSender = { id: string; name: string; avatar: Record<string, unknown> | null };
export type RackItem = {
  capsule_id: string; sender: RackSender; hint: string | null; opens_at: string;
  ready: boolean; has_question: boolean; question: string | null; is_friend: boolean; is_mine: boolean;
};
export type RackPage = { count: number; items: RackItem[]; next_cursor: string | null };
export type RackAt = { lat: number; lng: number; accuracy?: number | null } | null;
export type RackLeave = { body: string; hint: string; wait: RackWait; question?: string; answer?: string };
// rack_leave: too_far, bad_wait, blocked_words, no_answer. rack_open: taken, too_early, wrong_answer, too_far.
export type RackErrorCode = "too_far" | "too_early" | "wrong_answer" | "taken" | "own_capsule" | "bad_wait" | "blocked_words" | "no_answer" | "unknown";
export class RackError extends Error { constructor(public code: RackErrorCode) { super(code); } }

const code = (message: string): RackErrorCode =>
  (["too_far", "too_early", "wrong_answer", "taken", "own_capsule", "bad_wait", "blocked_words", "no_answer"] as const).find((c) => message.includes(c)) ?? "unknown";
const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new RackError(code(error.message));
  return data as T;
};
/** Same answer check as the server: trimmed, any case. */
export const answerMatches = (given: string, answer: string) => given.trim().toLowerCase() === answer.trim().toLowerCase();
export const isReady = (opensAt: string, now = Date.now()) => new Date(opensAt).getTime() <= now;

export const racks = {
  async list(waypostId: string, filter: RackFilter, cursor: string | null = null): Promise<RackPage> {
    if (RACK_BACKEND) return call<RackPage>("waypost_rack", { p_waypost: waypostId, p_filter: filter, p_cursor: cursor });
    return sample.list(waypostId, filter, cursor);
  },
  async leave(waypostId: string, at: RackAt, input: RackLeave): Promise<RackItem> {
    if (!at) throw new RackError("too_far");
    if (RACK_BACKEND) return call<RackItem>("rack_leave", {
      p_waypost: waypostId, p_lat: at.lat, p_lng: at.lng, p_accuracy: at.accuracy ?? null, p_body: input.body, p_hint: input.hint,
      p_wait_days: input.wait, p_lock_question: input.question || null, p_lock_answer: input.answer || null,
    });
    return sample.leave(waypostId, input);
  },
  /** First opener takes it: on success it leaves the rack and is in my Inbox under the returned id. */
  async open(capsuleId: string, at: RackAt, answer?: string): Promise<{ capsule_id: string; body: string; sender: RackSender }> {
    if (!at) throw new RackError("too_far");
    if (RACK_BACKEND) return call("rack_open", { p_capsule: capsuleId, p_lat: at.lat, p_lng: at.lng, p_accuracy: at.accuracy ?? null, p_answer: answer ?? null });
    return sample.open(capsuleId, answer);
  },
};

// ---- development sample (sample data, not real capsules) ----
const day = 86_400_000;
type SampleCapsule = RackItem & { waypost: string; body: string; answer: string | null };
const people: RackSender[] = [
  { id: "s1", name: "小晴", avatar: { set: "illus", id: "01" } },
  { id: "s2", name: "Ken", avatar: { set: "illus", id: "02" } },
  { id: "s3", name: "Mei", avatar: { set: "illus", id: "03" } },
  { id: "s4", name: "Leo", avatar: { set: "illus", id: "05" } },
  { id: "s5", name: "阿傑", avatar: { set: "illus", id: "06" } },
  { id: "s6", name: "Ava", avatar: { set: "illus", id: "07" } },
  { id: "s7", name: "佩佩", avatar: { set: "illus", id: "08" } },
];
const ME: RackSender = { id: "me", name: "我", avatar: { set: "illus", id: "04" } };
const seeds: [number, number, string, string | null, string | null, string, boolean?][] = [
  // sender, days left, hint, question, answer, letter, friend
  [0, 0, "給第一個停下來的人", null, null, "你好，路過的人。\n我在這裡等了三十分鐘的朋友，最後沒有來。\n希望你今天等的人都準時。"],
  [4, 4, "四天後見", null, null, "（示範信件）"],
  [2, 0, "只有站在這裡的人答得出來", "旁邊那棟灰色大樓叫什麼？", "市政府", "你答對了，代表你真的站在這裡。\n今天風很大，這封信寫給下一個站在這裡的人。"],
  [1, 29, "一個月後的這裡", null, null, "（示範信件）"],
  [6, 0, "朋友留的", null, null, "嘿！如果你是我的朋友，下次一起來這裡喝飲料。", true],
  [3, 365, "一年後再說", "我最喜歡的顏色？", "藍色", "（示範信件）"],
  [5, 1, "明天打開", null, null, "（示範信件）"],
  [0, 0, "下雨天寫的", null, null, "寫這封信的時候在下雨。\n如果你打開時是晴天，替我曬一下太陽。"],
  [4, 7, "下週同一時間", null, null, "（示範信件）", true],
];
const store = new Map<string, SampleCapsule[]>();
const rackFor = (waypost: string) => {
  let rack = store.get(waypost);
  if (!rack) {
    const now = Date.now();
    rack = seeds.map(([who, days, hint, question, answer, body, friend], i) => ({
      capsule_id: `sample-${waypost}-${i}`, waypost, sender: people[who], hint, opens_at: new Date(now + days * day).toISOString(),
      ready: days <= 0, has_question: !!question, question, answer, body, is_friend: !!friend, is_mine: false,
    }));
    store.set(waypost, rack);
  }
  return rack;
};
/** The sample says the rack is much bigger than what's shown, like a busy ema rack. */
const SAMPLE_EXTRA = 1275;
const matches = (c: RackItem, f: RackFilter) => f === "all" || (f === "ready" && isReady(c.opens_at)) || (f === "waiting" && !isReady(c.opens_at))
  || (f === "question" && c.has_question) || (f === "friends" && c.is_friend) || (f === "mine" && c.is_mine);
const strip = ({ waypost: _w, body: _b, answer: _a, ...item }: SampleCapsule): RackItem => ({ ...item, ready: isReady(item.opens_at) });
const sample = {
  async list(waypost: string, filter: RackFilter, cursor: string | null): Promise<RackPage> {
    const rack = rackFor(waypost).filter((c) => matches(c, filter));
    const from = cursor ? Number(cursor) : 0;
    const page = rack.slice(from, from + RACK_PAGE).map(strip);
    return { count: rackFor(waypost).length + SAMPLE_EXTRA, items: page, next_cursor: from + RACK_PAGE < rack.length ? String(from + RACK_PAGE) : null };
  },
  async leave(waypost: string, input: RackLeave): Promise<RackItem> {
    const c: SampleCapsule = {
      capsule_id: `sample-mine-${Date.now()}`, waypost, sender: ME, hint: input.hint || null, opens_at: new Date(Date.now() + input.wait * day).toISOString(),
      ready: false, has_question: !!input.question, question: input.question || null, answer: input.answer || null, body: input.body, is_friend: false, is_mine: true,
    };
    rackFor(waypost).unshift(c);
    return strip(c);
  },
  async open(capsuleId: string, answer?: string) {
    for (const rack of store.values()) {
      const i = rack.findIndex((c) => c.capsule_id === capsuleId);
      if (i < 0) continue;
      const c = rack[i];
      if (c.is_mine) throw new RackError("own_capsule");
      if (!isReady(c.opens_at)) throw new RackError("too_early");
      if (c.answer && !answerMatches(answer ?? "", c.answer)) throw new RackError("wrong_answer");
      rack.splice(i, 1);
      return { capsule_id: c.capsule_id, body: c.body, sender: c.sender };
    }
    throw new RackError("taken");
  },
  /** Test hook: pretend time passed for one capsule. */
  skipTime(capsuleId: string) {
    for (const rack of store.values()) { const c = rack.find((x) => x.capsule_id === capsuleId); if (c) c.opens_at = new Date(Date.now() - 1000).toISOString(); }
  },
};
/** Development only: the "skip time" shortcut on a sample capsule. */
export const rackSampleSkipTime = (capsuleId: string) => { if (RACK_SAMPLE) sample.skipTime(capsuleId); };
