"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  decodePlayerSave,
  getPlayerSnapshot,
  getServerPlayerSnapshot,
  MATERIALS,
  subscribeToPlayerSave,
} from "@/lib/player-save";

export default function InventoryPage() {
  const { bag } = decodePlayerSave(useSyncExternalStore(
    subscribeToPlayerSave,
    getPlayerSnapshot,
    getServerPlayerSnapshot,
  ));

  return (
    <main>
      <Link href="/game">
        ← Return Home
      </Link>

      <h1>Inventory</h1>
      <p>Your collected hunting materials.</p>

      <h2>Materials</h2>

      {MATERIALS.map(({ id, name }) => (
        <div key={id}>
          <p>
            {name}: {bag[id]}
          </p>
        </div>
      ))}
    </main>
  );
}
