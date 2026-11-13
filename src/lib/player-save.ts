export const MAX_HEALTH = 100;
export const MEAL_ATTACK_MULTIPLIER = 1.25;

export const MATERIALS = [
  { id: "mire-scale", name: "Mire Scale" },
  { id: "thorn-plate", name: "Thorn Plate" },
  { id: "ember-dust", name: "Ember Dust" },
] as const;

type MaterialId = (typeof MATERIALS)[number]["id"];
type Materials = Record<MaterialId, number>;

type PlayerSave = {
  health: number;
  mealReady: boolean;
  bag: Materials;
  chest: Materials;
};

const KEY = "hunterroams-player-v1";
const CHANGE_EVENT = "hunterroams-player-change";
const INITIAL_SAVE: PlayerSave = {
  health: MAX_HEALTH,
  mealReady: false,
  bag: { "mire-scale": 12, "thorn-plate": 7, "ember-dust": 18 },
  chest: { "mire-scale": 0, "thorn-plate": 0, "ember-dust": 0 },
};

let memorySave: string | null = null;

export function getPlayerSnapshot() {
  try {
    return window.localStorage.getItem(KEY) ?? memorySave;
  } catch {
    return memorySave;
  }
}

export function getServerPlayerSnapshot() {
  return null;
}

export function decodePlayerSave(snapshot: string | null): PlayerSave {
  if (!snapshot) return INITIAL_SAVE;
  try {
    const save = JSON.parse(snapshot) as Partial<PlayerSave> | null;
    if (!save) return INITIAL_SAVE;

    const readMaterials = (items: Partial<Materials> | undefined, fallback: Materials) => {
      const result = { ...fallback };
      for (const { id } of MATERIALS) {
        const quantity = items?.[id];
        if (typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity >= 0) {
          result[id] = quantity;
        }
      }
      return result;
    };

    return {
      health: typeof save.health === "number" && Number.isFinite(save.health)
        ? Math.max(0, Math.min(MAX_HEALTH, save.health))
        : MAX_HEALTH,
      mealReady: save.mealReady === true,
      bag: readMaterials(save.bag, INITIAL_SAVE.bag),
      chest: readMaterials(save.chest, INITIAL_SAVE.chest),
    };
  } catch {
    return INITIAL_SAVE;
  }
}

export function readPlayerSave() {
  return decodePlayerSave(getPlayerSnapshot());
}

export function updatePlayerSave(update: (save: PlayerSave) => PlayerSave) {
  memorySave = JSON.stringify(update(readPlayerSave()));
  try {
    window.localStorage.setItem(KEY, memorySave);
  } catch {
    // Keep the save available during this session if storage is disabled.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToPlayerSave(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function transferMaterial(id: MaterialId, from: "bag" | "chest") {
  updatePlayerSave((save) => {
    if (save[from][id] === 0) return save;
    const to = from === "bag" ? "chest" : "bag";
    return {
      ...save,
      [from]: { ...save[from], [id]: save[from][id] - 1 },
      [to]: { ...save[to], [id]: save[to][id] + 1 },
    };
  });
}
