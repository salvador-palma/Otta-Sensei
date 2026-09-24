"use client";

import { KanaResult } from "@/lib/pronunciation/types";

export function FeedbackPanel({ kana }: { kana: KanaResult | null }) {
    if (!kana) {
        return (
            <div className="text-slate-400 text-sm text-center min-h-24 flex items-center justify-center">
                Tap a red kana to see what went wrong.
            </div>
        );
    }

    const wrongPhonemes = kana.phonemes.filter((p) => !p.correct);

    return (
        <div className="w-full max-w-md rounded-xl border-2 border-red-200 bg-red-50 p-4 min-h-24">
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-red-500">{kana.char}</span>
                <span className="text-xs text-slate-500">
                    expected /{kana.groundPhonemes.join(" ")}/ · heard /
                    {kana.perceivedPhonemes.map((p) => p || "∅").join(" ")}/
                </span>
            </div>

            <ul className="flex flex-col gap-2">
                {wrongPhonemes.map((p, i) => (
                    <li key={i} className="text-sm text-slate-700">
                        <span className="font-mono font-bold text-red-600">
                            {p.ground} → {p.perceived || "∅"}
                        </span>
                        {p.feedback && <p className="mt-0.5">{p.feedback}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
