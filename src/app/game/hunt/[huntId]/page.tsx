import PhaserGame from "@/components/PhaserGame";

type HuntPageProps = {
  params: Promise<{
    huntId: string;
  }>;
  searchParams: Promise<{
    region?: string;
    room?: string;
    x?: string;
    y?: string;
    defeated?: string | string[];
  }>;
};

export default async function HuntPage({
  params,
  searchParams,
}: HuntPageProps) {
  const { huntId } = await params;
  const { region, room, x, y, defeated } = await searchParams;
  const returnQuery = new URLSearchParams();
  // Antelaur is currently scouted in Mirelow Marsh. Older hunt links omit region.
  returnQuery.set("region", typeof region === "string" && region ? region : "mirelow-marsh");
  if (typeof room === "string" && typeof x === "string" && typeof y === "string") {
    returnQuery.set("room", room);
    returnQuery.set("x", x);
    returnQuery.set("y", y);
  }
  const defeatedIds = new Set(Array.isArray(defeated) ? defeated : defeated ? [defeated] : []);
  defeatedIds.add(huntId);
  for (const id of defeatedIds) returnQuery.append("defeated", id);

  return (
    <main>
      <PhaserGame
        victoryUrl={`/game/hunting_ground?${returnQuery}`}
      />
    </main>
  );
}
