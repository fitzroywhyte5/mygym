import Link from "next/link";

import { SelectedRoutineCard } from "@/components/selected-routine-card";
import { VantaNetBg } from "@/components/vanta-net-bg";

export default async function DashboardPage() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div className="relative">
          <VantaNetBg className="absolute inset-0" />
          <div className="h-[260px] w-full bg-[radial-gradient(120%_120%_at_80%_10%,rgba(59,130,246,0.35)_0%,rgba(0,0,0,0)_58%),linear-gradient(135deg,rgba(0,0,0,0.72)_0%,rgba(11,26,58,0.65)_40%,rgba(0,0,0,0.85)_100%)]" />
          <div className="absolute inset-0 p-6 sm:p-10">
            <div className="max-w-xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Bienvenido a MYGYM
              </h1>
              <p className="mt-3 text-sm text-white/70 sm:text-base">
                Rutinas, nutrición y seguimiento en un solo lugar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/rutinas"
                  className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Empezar rutina
                </Link>
                <Link
                  href="/dashboard/seguimiento"
                  className="inline-flex h-10 items-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver progreso
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SelectedRoutineCard />
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Continuar</h2>
          <Link className="text-sm text-white/60 hover:text-white" href="/dashboard">
            Ver más
          </Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          <Link
            href="/dashboard/rutinas"
            className="min-w-[220px] rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty"
          >
            <div className="text-sm font-medium">Rutinas</div>
            <div className="mt-2 h-20 rounded-lg border border-white/10 bg-white/5" />
          </Link>
          <Link
            href="/dashboard/nutricion"
            className="min-w-[220px] rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-1"
          >
            <div className="text-sm font-medium">Nutrición</div>
            <div className="mt-2 h-20 rounded-lg border border-white/10 bg-white/5" />
          </Link>
          <Link
            href="/dashboard/seguimiento"
            className="min-w-[220px] rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-2"
          >
            <div className="text-sm font-medium">Seguimiento</div>
            <div className="mt-2 h-20 rounded-lg border border-white/10 bg-white/5" />
          </Link>
          <Link
            href="/dashboard/plan"
            className="min-w-[220px] rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-3"
          >
            <div className="text-sm font-medium">Plan</div>
            <div className="mt-2 h-20 rounded-lg border border-white/10 bg-white/5" />
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Recomendado</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty">
            <div className="text-sm font-medium">Full Body</div>
            <div className="mt-2 h-24 rounded-lg border border-white/10 bg-white/5" />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-1">
            <div className="text-sm font-medium">Push / Pull / Legs</div>
            <div className="mt-2 h-24 rounded-lg border border-white/10 bg-white/5" />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-2">
            <div className="text-sm font-medium">Cut</div>
            <div className="mt-2 h-24 rounded-lg border border-white/10 bg-white/5" />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty animate-floaty-delay-3">
            <div className="text-sm font-medium">Bulk</div>
            <div className="mt-2 h-24 rounded-lg border border-white/10 bg-white/5" />
          </div>
        </div>
      </section>
    </div>
  );
}
