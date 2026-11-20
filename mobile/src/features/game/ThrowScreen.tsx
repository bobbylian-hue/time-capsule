import React from "react";
import { Image } from "react-native";
import { gameArt } from "../../art/manifest";
import type { BallKind, CorruptedCapsule, GameState } from "../../services/game";

// The flick-and-ring fight was replaced by the dodge fight (DodgeFightScreen).
// These two pieces stay because the fight, Spin and the private-hunt views share them.

export function WaxBall({ kind, size }: { kind: BallKind; size: number }) {
  return <Image source={gameArt.ball[kind]} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** A park clearing painted in the live map's colours. */
export function ThrowBackground() {
  return <Image source={gameArt.catchBackground} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />;
}

export type FightScreenProps = {
  capsule: CorruptedCapsule; state: GameState; onState: (s: GameState) => void; onClose: (caught: boolean) => void;
};
