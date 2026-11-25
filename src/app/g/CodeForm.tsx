"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Sama dengan SESSION_CODE (src/lib/booth/session.ts) dan SessionCodeGenerator di tablet. */
const SESSION_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

function clean(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function CodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!SESSION_CODE.test(code)) {
          setError("Kode terdiri dari 6 huruf atau angka (tanpa O, I, 0, dan 1), mis. K7MP2Q.");
          return;
        }
        router.push(`/g/${code}`);
      }}
    >
      <label htmlFor="booth-code" className="font-heading text-sm font-semibold">
        Kode foto
      </label>
      <Input
        id="booth-code"
        value={code}
        autoComplete="off"
        autoCapitalize="characters"
        inputMode="text"
        placeholder="K7MP2Q"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "booth-code-error" : undefined}
        className="h-12 font-mono text-xl tracking-[0.3em] uppercase"
        onChange={(event) => {
          setCode(clean(event.target.value));
          setError(undefined);
        }}
      />
      {error && (
        <p id="booth-code-error" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12">
        Buka foto
      </Button>
    </form>
  );
}
