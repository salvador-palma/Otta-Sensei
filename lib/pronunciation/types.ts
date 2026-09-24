/**
 * Shared contract between the Python analyzer (python/analyze.py) and the UI.
 *
 * The Python script must emit JSON matching `PronunciationResult`. The frontend
 * never parses phonetics — it only reads this structure. Keep this file in sync
 * with the shape returned by analyze.py.
 */

/** Per-phoneme detail for a single kana. */
export type PhonemeResult = {
    /** Expected phoneme (ground truth). */
    ground: string;
    /** Detected phoneme. Empty string "" means the phoneme was dropped. */
    perceived: string;
    correct: boolean;
    /** Guidance shown when the learner inspects this phoneme. Null when correct. */
    feedback: string | null;
};

export type KanaStatus = "correct" | "wrong";

/** One kana — the unit the learner sees and clicks. */
export type KanaResult = {
    char: string;
    groundPhonemes: string[];
    perceivedPhonemes: string[];
    /** "wrong" if any phoneme in `phonemes` is incorrect. */
    status: KanaStatus;
    phonemes: PhonemeResult[];
};

/** Pronunciation problem a sentence targets; decides which recognizer checks it. */
export type Feature = "GEMINATE" | "FLAP" | "LVOWEL" | "DVOWEL";

/** A sentence to practise: ruby markup + expected IPA, one "|" group per kana. */
export type PracticeSentence = {
    sentence: string;
    ipa: string;
    feature: Feature | null;
};

export type PronunciationResult = {
    sentence: string;
    analysis: KanaResult[];
};
