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
    const close = kana.status === "close";
    // Wrong and close-enough kana both have feedback to show
    const inspectable = wrong || close;

    return (
        <span
            onClick={inspectable ? onSelect : undefined}
            role={inspectable ? "button" : undefined}
            tabIndex={inspectable ? 0 : undefined}
            className={cn(
                "transition-colors rounded-md px-0.5",
                wrong && "text-red-500 cursor-pointer hover:bg-red-50",
                close && "text-amber-500 cursor-pointer hover:bg-amber-50",
                !inspectable && "text-green-600",
                selected && wrong && "bg-red-100 ring-2 ring-red-400",
                selected && close && "bg-amber-100 ring-2 ring-amber-400"
            )}
        >
            {kana.char}
        </span>
    );
}
