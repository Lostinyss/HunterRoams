export type Encounter = {
  id: string;
  monsterName: string;
  zoneName: string;
  difficulty: number;
  element: string;
  distanceLabel: "Nearby" | "A short trek" | "Farther out";
};

export type HuntingGround = {
  regionId: string;
  name: string;
  biome: string;
  weather: string;
  timePeriod: string;
  zones: string[];
  encounters: Encounter[];
  timeSlot: number;
};

const regionData: Record<
  string,
  {
    name: string;
    biome: string;
    zones: string[];
    monsters: string[];
  }
> = {
  northwood: {
    name: "Northwood",
    biome: "Moonlit Forest",
    zones: ["Moonlit Clearing", "Thorn Ridge"],
    monsters: ["Thornback", "Cinder Moth"],
  },
  "mirelow-marsh": {
    name: "Mirelow Marsh",
    biome: "Misty Wetland",
    zones: ["Reed Bank", "Stillwater", "Hollow Creek"],
    monsters: ["Antelaur", "Antelaur", "Antelaur"],
  },
  "emberfall-ruins": {
    name: "Emberfall Ruins",
    biome: "Ashen Ruins",
    zones: ["Broken Gate", "Cinder Courtyard"],
    monsters: ["Cinder Moth", "Ashmaw"],
  },
};


export function generateHuntingGround(regionId: string): HuntingGround {

    
  const region = regionData[regionId] ?? regionData.northwood;
    
  const timeSlot = Math.floor(Date.now() / 1000 / 7200);

  return {
    regionId,
    name: region.name,
    biome: region.biome,
    weather: "Mist",
    timePeriod: "Night",
    zones: region.zones,
    timeSlot,
    encounters: region.monsters.map((monsterName, index) => ({
      id: `${regionId}-${timeSlot}-${index}`,
      monsterName,
      zoneName: region.zones[index % region.zones.length],
      difficulty: index + 1,
      element: index === 0 ? "Earth" : "Fire",
      distanceLabel: index === 0 ? "Nearby" : "A short trek",
    })),
  };
}
