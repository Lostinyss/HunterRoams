import { generateHuntingGround } from "@/lib/hunting_ground";
import ScoutingField from "@/components/hunting-ground/ScoutingField";
import { connection } from "next/server";
import Link from "next/link";

type HuntingGroundPageProps = {
  searchParams: Promise<{
    region?: string;
    room?: string;
    x?: string;
    y?: string;
    defeated?: string | string[];
  }>;
};

export default async function HuntingGroundPage({
  searchParams,
}: HuntingGroundPageProps) {
  await connection();
  const { region, room, x, y, defeated } = await searchParams;
  const defeatedIds = Array.isArray(defeated) ? defeated : defeated ? [defeated] : [];
  const returnPosition =
    typeof room === "string" && x && y &&
    Number.isFinite(Number(x)) && Number.isFinite(Number(y))
      ? { room, x: Number(x), y: Number(y) }
      : undefined;

  const huntingGround = generateHuntingGround(region ?? "northwood");
  const antelaurs = huntingGround.encounters.filter(
    (encounter) => encounter.monsterName === "Antelaur",
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{huntingGround.name}</h1>
      <p>Biome: {huntingGround.biome}</p>
      <p>Weather: {huntingGround.weather}</p>
      <p>Time: {huntingGround.timePeriod}</p>
      <Link className="mt-3 inline-block rounded border px-3 py-2" href="/game">Return Home</Link>

      {antelaurs.length > 0 ? (
        <ScoutingField
          key={antelaurs[0].id}
          region={huntingGround.regionId}
          encounters={antelaurs.filter(({ id }) => !defeatedIds.includes(id))}
          returnPosition={returnPosition}
          defeatedIds={defeatedIds}
        />
      ) : (
        <p className="my-6">Scouting is currently available in Mirelow Marsh.</p>
      )}
    </main>
  );
}
