import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

import { PasswordField } from "@/components/password-field";
import { VantaHaloBg } from "@/components/vanta-halo-bg";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <VantaHaloBg className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_10%,rgba(37,99,235,0.25)_0%,rgba(0,0,0,0)_55%),radial-gradient(80%_60%_at_0%_60%,rgba(2,132,199,0.18)_0%,rgba(0,0,0,0)_60%),radial-gradient(80%_60%_at_100%_70%,rgba(30,64,175,0.18)_0%,rgba(0,0,0,0)_60%)]" />

      <div className="relative w-full max-w-lg">
        <div className="mx-auto w-full max-w-md">
          <div className="relative">
            <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-9 pt-12 pb-14 text-white shadow-[0_20px_80px_-30px_rgba(37,99,235,0.6)] backdrop-blur-md [clip-path:polygon(50%_0%,93%_12%,100%_45%,93%_88%,50%_100%,7%_88%,0%_45%,7%_12%)]">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <Image
                  src="/IMG/Logo.png"
                  alt="MYGYM"
                  width={80}
                  height={80}
                  priority
                />
              </div>

              <div className="text-center">
                <h1 className="text-3xl font-semibold tracking-tight">Sign In</h1>
                <p className="mt-2 text-sm text-white/70">MYGYM</p>
              </div>

              {error ? (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <form action={signIn} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-medium text-white/70">
                    Email
                  </label>
                  <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-white/20">
                    <Mail className="h-4 w-4 text-white/70" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@email.com"
                      className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-medium text-white/70">
                    Password
                  </label>
                  <PasswordField required placeholder="••••••••" />
                </div>

                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-gradient-to-b from-blue-600 to-blue-800 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.8)] transition-transform hover:-translate-y-0.5"
                >
                  LOGIN
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-white/70">
                No account?{" "}
                <Link className="font-medium text-white underline underline-offset-4" href="/register">
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
