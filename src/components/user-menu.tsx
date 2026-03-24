"use client";

import * as React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

type Props = {
  email: string | null;
  initialFirstName?: string | null;
  initialLastName?: string | null;
};

const STORAGE_KEY = "mygym:profileImage";
const PROFILE_KEY = "mygym:userProfile";

type UserProfile = {
  firstName: string;
  lastName: string;
  age: string;
  heightCm: string;
  weightKg: string;
};

export function UserMenu({ email, initialFirstName, initialLastName }: Props) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [renderDrawer, setRenderDrawer] = React.useState(false);
  const [img, setImg] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UserProfile>({
    firstName: "",
    lastName: "",
    age: "",
    heightCm: "",
    weightKg: "",
  });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setImg(raw);
    } catch {
      // ignore
    }

    try {
      const rawProfile = window.localStorage.getItem(PROFILE_KEY);
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as Partial<UserProfile>;
        setProfile((p) => ({
          firstName: String(parsed.firstName ?? p.firstName),
          lastName: String(parsed.lastName ?? p.lastName),
          age: String(parsed.age ?? p.age),
          heightCm: String(parsed.heightCm ?? p.heightCm),
          weightKg: String(parsed.weightKg ?? p.weightKg),
        }));
      } else {
        setProfile((p) => ({
          ...p,
          firstName: initialFirstName ? String(initialFirstName) : p.firstName,
          lastName: initialLastName ? String(initialLastName) : p.lastName,
        }));
      }
    } catch {
      // ignore
    }
  }, [initialFirstName, initialLastName]);

  React.useEffect(() => {
    if (!renderDrawer) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!renderDrawer) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [renderDrawer]);

  React.useEffect(() => {
    function openDrawer() {
      setRenderDrawer(true);
      setOpen(false);
      window.requestAnimationFrame(() => setOpen(true));
    }

    function onOpenProfile() {
      openDrawer();
    }

    window.addEventListener("mygym:openProfile", onOpenProfile);
    return () => window.removeEventListener("mygym:openProfile", onOpenProfile);
  }, []);

  React.useEffect(() => {
    if (!renderDrawer) return;
    const scrollY = window.scrollY;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [renderDrawer]);

  React.useEffect(() => {
    if (open) {
      setRenderDrawer(true);
      return;
    }

    if (!renderDrawer) return;
    const t = window.setTimeout(() => setRenderDrawer(false), 560);
    return () => window.clearTimeout(t);
  }, [open, renderDrawer]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setImg(result);
      window.localStorage.setItem(STORAGE_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setImg(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const isProfileComplete =
    profile.firstName.trim() &&
    profile.lastName.trim() &&
    profile.age.trim() &&
    profile.heightCm.trim() &&
    profile.weightKg.trim();

  const canSave = Boolean(isProfileComplete);

  function saveProfile() {
    if (!canSave) return;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    try {
      window.dispatchEvent(new Event("mygym:profileChanged"));
    } catch {
      // ignore
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  function update<K extends keyof UserProfile>(key: K, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          setRenderDrawer(true);
          setOpen(false);
          window.requestAnimationFrame(() => setOpen(true));
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
        aria-label="Usuario"
      >
        {img ? (
          <span className="relative h-8 w-8 overflow-hidden rounded-full">
            <Image src={img} alt="Perfil" fill className="object-cover" sizes="32px" />
          </span>
        ) : (
          <span className="text-sm font-semibold text-white/80">U</span>
        )}
        {!isProfileComplete ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-black/40" />
        ) : null}
      </button>

      {renderDrawer && mounted
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-[9998] cursor-default bg-black/50 transition-opacity duration-500 ease-in-out ${
                  open ? "opacity-100" : "opacity-0"
                }`}
                aria-label="Cerrar"
              />

              <aside
                className={`fixed right-0 top-0 z-[9999] h-full w-[360px] max-w-[92vw] border-l border-white/10 bg-black/80 backdrop-blur transition-all duration-500 ease-in-out ${
                  open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
                }`}
              >
                <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Usuario</div>
                    <div className="text-xs text-white/60">{email ?? ""}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="scrollbar-none h-[calc(100%-56px)] overflow-y-auto p-4">
                  {!isProfileComplete ? (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">
                      Completa tu perfil para personalizar tus rutinas.
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Imagen de perfil</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
                        {img ? (
                          <span className="relative h-12 w-12">
                            <Image src={img} alt="Perfil" fill className="object-cover" sizes="48px" />
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-white/70">U</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onFileChange}
                          className="block w-full text-xs text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={clear}
                        className="h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white">Datos del perfil</div>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <div className="text-xs text-white/60">Nombre</div>
                        <input
                          value={profile.firstName}
                          onChange={(e) => update("firstName", e.target.value)}
                          placeholder="Nombre"
                          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-white/60">Apellido</div>
                        <input
                          value={profile.lastName}
                          onChange={(e) => update("lastName", e.target.value)}
                          placeholder="Apellido"
                          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-xs text-white/60">Edad</div>
                          <input
                            value={profile.age}
                            onChange={(e) => update("age", e.target.value)}
                            inputMode="numeric"
                            placeholder="18"
                            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-white/60">Altura (cm)</div>
                          <input
                            value={profile.heightCm}
                            onChange={(e) => update("heightCm", e.target.value)}
                            inputMode="numeric"
                            placeholder="170"
                            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-white/60">Peso (kg)</div>
                          <input
                            value={profile.weightKg}
                            onChange={(e) => update("weightKg", e.target.value)}
                            inputMode="numeric"
                            placeholder="70"
                            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-white/50">
                        {saved ? "Guardado" : !canSave ? "Completa todos los campos" : ""}
                      </div>
                      <button
                        type="button"
                        disabled={!canSave}
                        onClick={saveProfile}
                        className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-500"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
