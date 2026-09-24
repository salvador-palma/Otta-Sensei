"use client";

import { cn } from "@/lib/utils";
import { KanaResult } from "@/lib/pronunciation/types";

export function KanaToken({
    kana,
    selected,
    onSelect,
}: {
    kana: KanaResult;
    selected: boolean;
    onSelect: () => void;
}) {
    const wrong = kana.status === "wrong";

    return (
        <span
            onClick={wrong ? onSelect : undefined}
            role={wrong ? "button" : undefined}
            tabIndex={wrong ? 0 : undefined}
            className={cn(
                "transition-colors rounded-md px-0.5",
                wrong
                    ? "text-red-500 cursor-pointer hover:bg-red-50"
                    : "text-green-600",
                selected && "bg-red-100 ring-2 ring-red-400"
            )}
        >
            {kana.char}
        </span>
    );
}
