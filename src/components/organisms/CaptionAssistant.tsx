"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { suggestCaption } from "@/app/(portal)/admin/projects/ai-actions";
import { Button } from "@/components/ui/button";

type Option = { caption: string; hashtags: string[] };

type CaptionAssistantProps = {
  projectId: string;
  contentId: string;
  input: { title: string; brief: string; caption: string; format: string; brandId: string | null };
  enabled: boolean;
  onPick: (caption: string) => void;
};

/** Tombol "Buat dengan AI": 3 pilihan caption + hashtag sesuai brief & gaya bahasa brand. */
export function CaptionAssistant({
  projectId,
  contentId,
  input,
  enabled,
  onPick,
}: CaptionAssistantProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await suggestCaption(projectId, contentId, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOptions(result.options);
    });
  }

  if (!enabled) {
    return (
      <p className="text-xs text-ink/60">
        Asisten caption AI aktif setelah ANTHROPIC_API_KEY diisi di Vercel.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {options.length ? "Buat ulang" : "Buat caption dengan AI"}
        </Button>
        <span className="text-xs text-ink/60">
          {pending
            ? "Menulis 3 pilihan…"
            : "Dari judul, brief, dan gaya bahasa di brand kit. Periksa lagi sebelum dipakai."}
        </span>
      </div>
      {options.length > 0 && (
        <ul className="grid gap-2" aria-label="Pilihan caption dari AI">
          {options.map((option, index) => {
            const full = `${option.caption}\n\n${option.hashtags.join(" ")}`.trim();
            return (
              <li key={index} className="rounded-xl border border-line bg-canvas p-3 text-sm">
                <p className="whitespace-pre-line text-ink">{option.caption}</p>
                {option.hashtags.length > 0 && (
                  <p className="mt-2 text-xs break-words text-primary">
                    {option.hashtags.join(" ")}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    onPick(full);
                    setOptions([]);
                    toast.success("Caption dipakai. Jangan lupa simpan.");
                  }}
                >
                  <Check aria-hidden />
                  Pakai pilihan {index + 1}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
