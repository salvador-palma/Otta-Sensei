"use client";

import { PracticeSentence, PronunciationResult } from "./types";

/**
 * Sends the recorded audio + sentence, its expected IPA and its feature tag to
 * the API route, which forwards them to the Python analyzer and returns the
 * per-kana result.
 */
export async function analyzePronunciation(
    audio: Blob,
    { sentence, ipa, feature }: PracticeSentence
): Promise<PronunciationResult> {
    const form = new FormData();
    form.append("audio", audio, "utterance.webm");
    form.append("sentence", sentence);
    form.append("ipa", ipa);
    if (feature) form.append("feature", feature);

    const res = await fetch("/api/pronounce", {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Analysis failed (${res.status})`);
    }

    return (await res.json()) as PronunciationResult;
}
