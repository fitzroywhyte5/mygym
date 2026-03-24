"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordField({
  id = "password",
  name = "password",
  required,
  minLength,
  placeholder,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-white/20">
      <Lock className="h-4 w-4 text-white/70" />
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:text-white"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
