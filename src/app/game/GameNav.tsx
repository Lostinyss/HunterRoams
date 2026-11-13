import Link from "next/link";

export default function GameNav() {
  return (
    <nav className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
      <Link href="/game/hunting-ground" className="font-semibold tracking-[0.18em] text-amber-300 uppercase">
        Hunter Roams
      </Link>
      <div className="flex gap-4 text-sm text-slate-300">
        <Link className="transition hover:text-white" href="/game/hunting_ground">Ground</Link>
        <Link className="transition hover:text-white" href="/game/inventory">Inventory</Link>
      </div>
    </nav>
  );
}
