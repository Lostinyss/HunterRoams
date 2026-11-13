"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Game } from "phaser";
import type { HomeDirection, HomeStation } from "./home/createHomeGame";
import {
  decodePlayerSave,
  getPlayerSnapshot,
  getServerPlayerSnapshot,
  MATERIALS,
  MAX_HEALTH,
  subscribeToPlayerSave,
  transferMaterial,
  updatePlayerSave,
} from "@/lib/player-save";

const panel = "space-y-3 rounded-lg border border-stone-700 bg-stone-900 p-5";
const button = "rounded bg-amber-300 px-3 py-2 font-semibold text-stone-950 disabled:opacity-50";
const directions = [
  { key: "up", arrow: "↑", position: "col-start-2" },
  { key: "left", arrow: "←", position: "row-start-2" },
  { key: "down", arrow: "↓", position: "row-start-2" },
  { key: "right", arrow: "→", position: "row-start-2" },
] as const;

export default function PlayerHome({
  regions,
}: {
  regions: { id: string; name: string; description: string }[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef({
    held: new Set<HomeDirection>(),
    interact: false,
    menuOpen: false,
    mealReady: false,
  });
  const [nearby, setNearby] = useState<HomeStation | null>(null);
  const [station, setStation] = useState<HomeStation | null>(null);
  const [loadError, setLoadError] = useState(false);
  const save = decodePlayerSave(useSyncExternalStore(
    subscribeToPlayerSave,
    getPlayerSnapshot,
    getServerPlayerSnapshot,
  ));

  useEffect(() => {
    input.current.mealReady = save.mealReady;
  }, [save.mealReady]);

  useEffect(() => {
    let cancelled = false;
    let game: Game | undefined;
    const controls = input.current;

    void import("./home/createHomeGame")
      .then(({ createHomeGame }) => {
        if (cancelled || !container.current) return;
        game = createHomeGame(container.current, controls, setNearby, (selected) => {
          if (selected === "bed") {
            updatePlayerSave((current) => ({ ...current, health: MAX_HEALTH }));
            return;
          }
          if (selected === "food") {
            updatePlayerSave((current) => ({ ...current, mealReady: true }));
            return;
          }

          controls.menuOpen = true;
          controls.held.clear();
          setStation(selected);
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      controls.held.clear();
      game?.destroy(true);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (station && element && !element.open) element.showModal();
  }, [station]);

  function resetStation() {
    input.current.menuOpen = false;
    input.current.interact = false;
    setStation(null);
  }

  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-3xl font-semibold">Hunter’s Home</h1>
          <p className="mt-2 text-stone-300" role="status">
            Health {save.health} / {MAX_HEALTH}
            {save.mealReady && " · [ATK+]"}
          </p>
        </header>

        <p className="text-sm text-stone-300">
          Press E or Use when near furniture.
        </p>
        <div
          ref={container}
          className="aspect-video w-full touch-none overflow-hidden rounded-lg bg-[#241b17] [&>canvas]:[image-rendering:pixelated]"
          aria-label="Walkable hunter’s house"
        />
        {loadError && <p role="alert">The house couldn’t load. Refresh to try again.</p>}
        <div className="flex items-center gap-4">
          <div className="grid w-fit grid-cols-3 gap-1 select-none" aria-label="Movement controls">
            {directions.map(({ key, arrow, position }) => (
              <button
                key={key}
                type="button"
                aria-label={`Move ${key}`}
                className={`${position} size-11 touch-none rounded border border-stone-600 active:bg-stone-700`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  input.current.held.add(key);
                }}
                onLostPointerCapture={() => input.current.held.delete(key)}
              >
                {arrow}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={button}
            disabled={!nearby}
            onClick={() => { input.current.interact = true; }}
          >
            Use
          </button>
        </div>

        <dialog
          ref={dialog}
          aria-labelledby="home-station-title"
          className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-stone-700 bg-stone-950 p-4 text-stone-100 backdrop:bg-black/70"
          onClose={resetStation}
        >
          {station === "chest" && (
            <section className={panel}>
              <h2 id="home-station-title" className="text-xl font-semibold">Storage Chest</h2>
              <p>No capacity limit. Move materials between your bag and chest.</p>
              <ul className="divide-y divide-stone-700">
                {MATERIALS.map(({ id, name }) => (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-stone-300">Bag {save.bag[id]} · Chest {save.chest[id]}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className={button} disabled={!save.bag[id]} onClick={() => transferMaterial(id, "bag")} aria-label={`Deposit one ${name}`}>Deposit</button>
                      <button type="button" className={button} disabled={!save.chest[id]} onClick={() => transferMaterial(id, "chest")} aria-label={`Withdraw one ${name}`}>Withdraw</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {station === "map" && (
            <section className={panel}>
              <h2 id="home-station-title" className="text-xl font-semibold">Map Table</h2>
              {save.health === 0 && <p>Sleep to recover before traveling.</p>}
              <ul className="grid gap-3 sm:grid-cols-3">
                {regions.map(({ id, name, description }) => (
                  <li key={id} className="space-y-2 rounded border border-stone-700 p-3">
                    <h3 className="font-semibold">{name}</h3>
                    <p className="text-sm text-stone-300">{description}</p>
                    {save.health > 0 && (
                      <Link
                        className="inline-block text-amber-200 underline"
                        href={`/game/hunting_ground?region=${id}`}
                        onNavigate={() => {
                          dialog.current?.close();
                          resetStation();
                        }}
                      >
                        Travel to {name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <form method="dialog" className="mt-3">
            <button className="rounded border border-stone-600 px-3 py-2">Close</button>
          </form>
        </dialog>
      </div>
    </main>
  );
}
