"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type PhaserTypes from "phaser";
import { MEAL_ATTACK_MULTIPLIER, readPlayerSave, updatePlayerSave } from "@/lib/player-save";

export default function PhaserGame({ victoryUrl }: { victoryUrl: string }) {
  const router = useRouter();
  const gameContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: PhaserTypes.Game | undefined;
    let cancelled = false;

    async function startGame() {
      const { createHuntGame } = await import("./hunt/createHuntGame");

      if (cancelled || !gameContainer.current) return;

      const save = readPlayerSave();
      if (save.health === 0) {
        router.replace("/game");
        return;
      }

      game = createHuntGame(
        gameContainer.current,
        () => { if (!cancelled) router.replace("/game"); },
        () => { if (!cancelled) router.replace(victoryUrl); },
        {
          health: save.health,
          attackMultiplier: save.mealReady ? MEAL_ATTACK_MULTIPLIER : 1,
          onHealthChange: (health) => {
            updatePlayerSave((current) => ({ ...current, health }));
          },
          onStart: () => {
            if (!cancelled && save.mealReady) {
              updatePlayerSave((current) => ({ ...current, mealReady: false }));
            }
          },
        },
      );
    }

    void startGame();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [router, victoryUrl]);

  return (
    <div
      ref={gameContainer}
      className="h-dvh w-full overflow-hidden bg-black [&>canvas]:[image-rendering:pixelated]"
    />
  );
}
