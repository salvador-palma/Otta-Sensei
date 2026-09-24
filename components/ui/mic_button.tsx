"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MicState = "idle" | "recording" | "analyzing";

export function MicButton({
    state,
    onStart,
    onStop,
}: {
    state: MicState;
    onStart: () => void;
    onStop: () => void;
}) {
    if (state === "analyzing") {
        return (
            <Button variant="primary" size="icon-lg" clickable={false}>
                <Loader2 className="animate-spin" />
            </Button>
        );
    }

    const recording = state === "recording";

    return (
        <Button
            variant="primary"
            size="icon-lg"
            onClick={recording ? onStop : onStart}
            className={recording ? "animate-pulse" : undefined}
            aria-label={recording ? "Stop recording" : "Start recording"}
        >
            {recording ? <Square /> : <Mic />}
        </Button>
    );
}
