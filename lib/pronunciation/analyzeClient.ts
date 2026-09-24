"use client";

import { PronunciationResult } from "./types";

/**
 * Sends the recorded audio + sentence to the API route, which runs the Python
 * analyzer and returns the structured per-kana result.
 */
export async function analyzePronunciation(
    audio: Blob,
    sentence: string
): Promise<PronunciationResult> {
    const form = new FormData();
    form.append("audio", audio, "utterance.webm");
    form.append("sentence", sentence);

    const res = await fetch("/api/pronounce", {
        method: "POST",
        body: form,
    });

    

    if (!res.ok) {
        throw new Error(`Analysis failed (${res.status})`);
    }

    return (await res.json()) as PronunciationResult;
}
