"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Game } from "phaser";
import type { Encounter } from "@/lib/hunting_ground";
import type { Direction, ScoutingPosition, ScoutingTouchInput } from "./createScoutingGame";

const controls: { direction: Direction; arrow: string; position: string }[] = [
  { direction: "up", arrow: "↑", position: "col-start-2" },
  { direction: "left", arrow: "←", position: "row-start-2" },
  { direction: "down", arrow: "↓", position: "row-start-2" },
  { direction: "right", arrow: "→", position: "row-start-2" },
];

export default function ScoutingField({
  encounters,
  region,
  returnPosition,
  defeatedIds,
}: {
  encounters: Encounter[];
  region: string;
  returnPosition?: ScoutingPosition;
  defeatedIds: string[];
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const touchInput = useRef<ScoutingTouchInput>({ held: new Set(), dashRequested: false });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let game: Game | undefined;
    const input = touchInput.current;

    void import("./createScoutingGame")
      .then(({ createScoutingGame }) => {
        if (!cancelled && container.current) {
          game = createScoutingGame(
            container.current,
            encounters,
            (encounter, position) => {
              const query = new URLSearchParams({
                region,
                room: position.room,
                x: String(position.x),
                y: String(position.y),
              });
              for (const id of defeatedIds) query.append("defeated", id);
              router.push(`/game/hunt/${encodeURIComponent(encounter.id)}?${query}`);
            },
            input,
            () => router.push("/game"),
            returnPosition,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      input.held.clear();
      input.dashRequested = false;
      game?.destroy(true);
    };
  }, [encounters, region, returnPosition, defeatedIds, router]);

  return (
    <section className="my-6 space-y-3" aria-label="Scouting field">
      <p className="text-sm">Arrow keys to move, Shift to run, Space to dash. Touch Monster to enter battle. Leave through the entrance’s west gate to go Home.</p>
      <div
        ref={container}
        className="aspect-video w-full touch-none overflow-hidden rounded-md bg-[#202e28] [&>canvas]:[image-rendering:pixelated]"
      />
      {loadError && (
        <p role="status">The field couldn’t load. Refresh to try again.</p>
      )}
      <div className="grid w-fit grid-cols-3 gap-1 select-none" aria-label="Movement controls">
        {controls.map(({ direction, arrow, position }) => (
          <button
            key={direction}
            type="button"
            aria-label={`Move ${direction}`}
            className={`${position} size-11 touch-none rounded border border-current active:bg-current/15`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              touchInput.current.held.add(direction);
            }}
            onLostPointerCapture={() => touchInput.current.held.delete(direction)}
          >
            {arrow}
          </button>
        ))}
      </div>
      <div className="flex gap-2" aria-label="Run and dash controls">
        <button
          type="button"
          className="min-h-11 touch-none select-none rounded border px-4"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            touchInput.current.held.add("run");
          }}
          onLostPointerCapture={() => touchInput.current.held.delete("run")}
        >
          Hold to run
        </button>
        <button
          type="button"
          className="min-h-11 touch-manipulation rounded border px-4"
          onClick={() => { touchInput.current.dashRequested = true; }}
        >
          Dash
        </button>
      </div>
    </section>
  );
}
