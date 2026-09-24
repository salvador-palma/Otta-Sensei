"use client";

import { useState } from "react";
import { useRecorder } from "@/lib/audio/useRecorder";
import { analyzePronunciation } from "@/lib/pronunciation/analyzeClient";
import { PracticeSentence, PronunciationResult } from "@/lib/pronunciation/types";
import { MicButton, MicState } from "@/components/ui/mic_button";
import { KanaToken } from "@/components/ui/kana_token";
import { FeedbackPanel } from "@/components/ui/feedback_panel";
import { Furigana } from "@/components/ui/furigana";

function SpeakSession({ allSentences }: { allSentences: PracticeSentence[] }) {
    const [deck] = useState(allSentences);

    // Pronunciation flow state.
    const [micState, setMicState] = useState<MicState>("idle");
    const [result, setResult] = useState<PronunciationResult | null>(null);
    const [selectedKana, setSelectedKana] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recorder = useRecorder();
    const current: PracticeSentence | undefined = deck[0];
    const currentSentence: string | undefined = current?.sentence;

    const handleStart = async () => {
        setError(null);
        setResult(null);
        setSelectedKana(null);
        await recorder.start();
        setMicState("recording");
    };

    const handleStop = async () => {
        try {
            const audio = await recorder.stop();
            setMicState("analyzing");
            const analysis = await analyzePronunciation(audio, current!);
            setResult(analysis);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setMicState("idle");
        }
    };

    if (!currentSentence) return <div>No more cards!</div>;

    const selected =
        result && selectedKana !== null ? result.analysis[selectedKana] : null;
    console.log(result?.analysis)
    return (
        <div className="flex flex-col items-center gap-y-8">
            {/* Sentence: ruby furigana before analysis, color-coded kana after. */}
            {result ? (
                <div className="flex flex-col items-center gap-y-3">
                    <h1 className="font-bold text-3xl flex flex-wrap justify-center">
                        {result.analysis.map((kana, i) => (
                            <KanaToken
                                key={i}
                                kana={kana}
                                selected={selectedKana === i}
                                onSelect={() => setSelectedKana(i)}
                            />
                        ))}
                    </h1>
                    {/* Keep the original kanji + furigana visible for context. */}
                    <Furigana text={currentSentence} className="text-lg text-slate-400 [&_rt]:text-slate-400" />
                </div>
            ) : (
                <h1 className="font-bold text-3xl">
                    <Furigana text={currentSentence} />
                </h1>
            )}

            <MicButton state={micState} onStart={handleStart} onStop={handleStop} />

            {error && <p className="text-sm text-red-500">{error}</p>}

            {result && <FeedbackPanel kana={selected} />}
        </div>
    );
}

export default SpeakSession;
