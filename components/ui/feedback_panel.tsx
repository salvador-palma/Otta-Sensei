"use client";

import { cn } from "@/lib/utils";
import { KanaResult } from "@/lib/pronunciation/types";

export function FeedbackPanel({ kana }: { kana: KanaResult | null }) {
    if (!kana) {
        return (
            <div className="text-slate-400 text-sm text-center min-h-24 flex items-center justify-center">
                Tap a red or yellow kana to see what went wrong.
            </div>
        );
    }

    // Yellow kana passed but were not exact; show the same feedback in amber
    const close = kana.status === "close";
    const inexactPhonemes = kana.phonemes.filter((p) => !p.exact);

    return (
        <div className={cn(
            "w-full max-w-md rounded-xl border-2 p-4 min-h-24",
            close ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
        )}>
            <div className="flex items-baseline gap-2 mb-2">
                <span className={cn("text-2xl font-bold", close ? "text-amber-500" : "text-red-500")}>
                    {kana.char}
                </span>
                <span className="text-xs text-slate-500">
                    expected /{kana.groundPhonemes.join(" ")}/ · heard /
                    {kana.perceivedPhonemes.map((p) => p || "∅").join(" ")}/
                </span>
            </div>

            {close && (
                <p className="text-xs font-semibold text-amber-600 mb-2">Close enough, but not quite:</p>
            )}

            <ul className="flex flex-col gap-2">
                {inexactPhonemes.map((p, i) => (
                    <li key={i} className="text-sm text-slate-700">
                        <span className={cn(
                            "font-mono font-bold",
                            p.correct ? "text-amber-600" : "text-red-600"
                        )}>
                            {p.ground || "+"} → {p.perceived || "∅"}
                        </span>
                        {p.feedback && <p className="mt-0.5">{p.feedback}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
