import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Search } from "lucide-react";

import { signOut } from "@/app/logout/actions";
import { UserMenu } from "@/components/user-menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function searchDashboard(formData: FormData) {
    "use server";

    const rawQuery = formData.get("q");
    const query = typeof rawQuery === "string" ? rawQuery : "";

    const trimmed = query.trim();
    if (!trimmed) {
      redirect("/dashboard");
    }

    redirect(`/dashboard/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-full flex flex-col text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#173a7a_0%,#0b1a3a_45%,#000000_100%),radial-gradient(70%_60%_at_15%_20%,rgba(59,130,246,0.22)_0%,rgba(0,0,0,0)_62%),radial-gradient(70%_60%_at_85%_35%,rgba(37,99,235,0.18)_0%,rgba(0,0,0,0)_65%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.45)_70%,rgba(0,0,0,0.6)_100%)]" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/IMG/Logo.png" alt="MYGYM" width={18} height={18} priority />
            <span className="text-sm font-semibold tracking-wide">MYGYM</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm text-white/70 md:flex">
            <Link className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white" href="/dashboard">
              Inicio
            </Link>
            <Link
              className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white"
              href="/dashboard/rutinas"
            >
              Rutinas
            </Link>
            <Link
              className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white"
              href="/dashboard/nutricion"
            >
              Nutrición
            </Link>
            <Link
              className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white"
              href="/dashboard/seguimiento"
            >
              Seguimiento
            </Link>
            <Link className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-white" href="/dashboard/plan">
              Plan
            </Link>
          </nav>

          <div className="flex-1" />

          <div className="hidden w-72 md:block">
            <form action={searchDashboard}>
              <div className="flex">
                <input
                  name="q"
                  placeholder="Buscar"
                  className="h-9 flex-1 rounded-l-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="h-9 rounded-r-md border border-l-0 border-white/10 bg-white/5 px-3 text-sm text-white hover:bg-white/10"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-white/70 lg:block">{user.email}</div>
            <UserMenu
              email={user.email ?? null}
              initialFirstName={(user.user_metadata?.first_name as string | undefined) ?? null}
              initialLastName={(user.user_metadata?.last_name as string | undefined) ?? null}
            />
            <form action={signOut}>
              <button
                type="submit"
                className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
