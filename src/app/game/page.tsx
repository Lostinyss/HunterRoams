import PlayerHome from "@/components/PlayerHome";

const regions = [
  {
    id: "northwood",
    name: "Northwood",
    description: "Ancient forest filled with predators and gathering creatures.",
  },
  {
    id: "mirelow-marsh",
    name: "Mirelow Marsh",
    description: "A misty wetland where toxic monsters roam.",
  },
  {
    id: "emberfall-ruins",
    name: "Emberfall Ruins",
    description: "Ash-covered ruins inhabited by fire creatures.",
  },
];

export default function GamePage() {
  return <PlayerHome regions={regions} />;
}
