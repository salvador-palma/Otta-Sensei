"""
analyze.py — Pronunciation analysis (allosaurus).

Two parts:

  1. DetectPhoneme() -> Runs allosaurus phoneme recognition on the audio
                        (`out`) and builds the per-kana ground truth (`ground`)
                        from the sentence's reading via espeak G2P. Ported from
                        PhonemeRecognizer.ipynb (allosaurus path).

  2. BuildAnalysis() -> Aligns the detected `out` sequence against the ground
                        truth, then slices the alignment into the per-kana
                        analysis array the frontend consumes.

The recognizer gives ONLY a flat detected phoneme sequence (`out`) with no
alignment. BuildAnalysis() aligns it against the ground truth itself
(edit-distance / Needleman–Wunsch) and classifies each column as:

    match        ground phoneme == detected phoneme     -> correct
    substitution ground replaced by a different sound    -> wrong
    deletion     ground phoneme missing from `out`       -> wrong, perceived ""
    insertion    extra detected sound with no ground     -> wrong (extra sound)

CONTRACT (frontend reads this; never parses phonetics itself)
-------------------------------------------------------------
Each entry in `analysis` is ONE kana:
    char              : the kana shown to the learner
    groundPhonemes    : phonemes that SHOULD be said for this kana
    perceivedPhonemes : phonemes that WERE detected for this kana
    status            : "correct" | "wrong"  (wrong if any phoneme is wrong)
    phonemes[]        : per-phoneme detail
        ground    : expected phoneme ("" for an inserted/extra sound)
        perceived : detected phoneme ("" if dropped)
        correct   : bool
        feedback  : str | None

NOTE: The grapheme->phoneme and recognizer dependencies (phonemizer/espeak-ng,
allosaurus) are heavy. They are imported lazily inside the functions that need
them so that BuildAnalysis() and the alignment can be tested without them.
"""

import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

LOG_PATH = os.path.join(os.path.dirname(__file__), "output.txt")
logFile = open(LOG_PATH, "w", encoding="utf-8")

def log(*args, **kwargs):
    print(*args, **kwargs, file=logFile, flush=True)


# --------------------------------------------------------------------------- #
# espeak-ng setup (Windows)                                                    #
# --------------------------------------------------------------------------- #
# phonemizer needs the espeak-ng shared library; on Windows it does not find it
# automatically. Point it at the default install location unless the caller has
# already set PHONEMIZER_ESPEAK_LIBRARY (e.g. for a non-standard install).
_DEFAULT_ESPEAK_DLLS = [
    r"C:\Program Files\eSpeak NG\libespeak-ng.dll",
    r"C:\Program Files (x86)\eSpeak NG\libespeak-ng.dll",
]
if "PHONEMIZER_ESPEAK_LIBRARY" not in os.environ:
    for _dll in _DEFAULT_ESPEAK_DLLS:
        if os.path.exists(_dll):
            os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = _dll
            break

_espeak_patched = False


def _ensure_native_ja_voice():
    """
    espeak lists the mbrola Japanese voices (which require mbrola.dll, usually
    absent on Windows) BEFORE the native voice, so phonemizer's default "ja"
    resolution fails with 'failed to load voice "ja"'. Patch set_voice to prefer
    the native (non-mbrola) Japanese voice. Idempotent.
    """
    global _espeak_patched
    if _espeak_patched:
        return
    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    original = EspeakWrapper.set_voice

    def patched(self, voice_code):
        if voice_code == "ja":
            for voice in self.available_voices():
                head = voice.identifier.replace("\\", "/").split("/")[0]
                if voice.language == "ja" and head != "mb":
                    if self._espeak.set_voice_by_name(
                        voice.identifier.encode("utf8")
                    ) == 0:
                        self._voice = voice
                        return
        return original(self, voice_code)

    EspeakWrapper.set_voice = patched
    _espeak_patched = True


NormalizationTable = {
    "ɽ":  "ɾ",
    "ä":  "ɑ̟",
    "ɯᵝ": "ɯ̟",
    "ũ":  "m",
}

# Long-vowel set used to decide gemination "Q" vs long-vowel "H".
_LONG_VOWELS = ["o̞", "e̞", "ɑ̟", "ɯ̟", "i"]


def NormalisePhonemes(phones):
    """espeak phone post-processing: normalize symbols + mark gemination/length."""
    normalized = [NormalizationTable.get(p, p) for p in phones]
    if not normalized:
        return []

    result = [normalized[0]]
    for i in range(1, len(normalized)):
        if normalized[i] == normalized[i - 1]:
            # Repeated phone: long vowel -> "H", repeated consonant -> "Q".
            result.append("H" if normalized[i] in _LONG_VOWELS else "Q")
            continue
        if normalized[i].endswith("ː"):
            result.append(normalized[i][0])
            result.append("H")
        else:
            result.append(normalized[i])
    return result


def GetJapanesePhonemes(hiragana_sentence: str, lang="ja") -> list[str]:
    
    
    """
    Text (kana) -> ground-truth phoneme list.

    THIS IS THE GROUND-TRUTH HOOK. It currently uses espeak, but espeak's ONLY
    job is this conversion — if you'd rather supply phonemes from your own
    kana->phoneme table, replace the body of this function. Nothing else in the
    pipeline depends on espeak.

    Returns a flat list of phonemes for the given kana text, e.g.
        "さくら" -> ["s", "ɑ̟", "k", "ɯ̟", "ɾ", "ɑ̟"]
    """
    return _espeak_phonemes(hiragana_sentence, lang)


def _espeak_phonemes(text, lang="ja") -> list[str]:
    """espeak G2P -> normalized phoneme list. Requires phonemizer + espeak-ng."""
    from phonemizer import phonemize
    from phonemizer.separator import Separator

    _ensure_native_ja_voice()

    raw = phonemize(
        text,
        backend="espeak",
        language=lang,
        with_stress=False,
        separator=Separator(phone=" ", word="    ", syllable=""),
    )
    phones = [p for p in raw.strip().split(" ") if p]
    return NormalisePhonemes(phones)


# i and u are devoiced when surrounded by voiceless consonants.
_VOICELESS = ["p", "t", "k", "s", "ɕ", "ç", "h", "ɸ"]


def CorrectDevoicing(phones):
    """Drop devoiced i/u/ɯ̟ between voiceless consonants (matches notebook)."""
    corrected = []
    for i, p in enumerate(phones):
        if p in ["i", "u", "ɯ̟"]:
            prev_voiceless = (i == 0 or phones[i - 1] in _VOICELESS)
            next_voiceless = (i == len(phones) - 1 or phones[i + 1] in _VOICELESS)
            if prev_voiceless and next_voiceless:
                continue
        corrected.append(p)
    return corrected


# --------------------------------------------------------------------------- #
# Recognizer: Allosaurus, ported from PhonemeRecognizer.ipynb                  #
# --------------------------------------------------------------------------- #

ALLOSAURUS_VOWEL_NORM = {
    "a": "ɑ̟",   # broad /a/ -> Vance near-open central
    "u": "ɯ̟",   # broad /u/ -> Vance compressed back
    "o": "o̞",   # broad /o/ -> Vance lowered mid-back
    "e": "e̞",   # broad /e/ -> Vance lowered mid-front
    # /i/ identical in both conventions
}

# Allosaurus model is loaded once, lazily.
_allo_model = None


def _get_allo_model():
    global _allo_model
    if _allo_model is None:
        from allosaurus.app import read_recognizer
        _allo_model = read_recognizer()
    return _allo_model


def NormalizeAllosaurus(phones):
    result = []
    for phone in phones:
        if phone.endswith("ː") and len(phone) > 1:
            base = phone[:-1]
            norm_base = ALLOSAURUS_VOWEL_NORM.get(base, base)
            result.append(norm_base)
            result.append("H" if norm_base in _LONG_VOWELS else "Q")
        else:
            result.append(ALLOSAURUS_VOWEL_NORM.get(phone, phone))
    return result


def RecognizeAllosaurus(path, lang="jpn"):
    # allosaurus only accepts WAV. The browser records webm/opus, so convert
    # anything that isn't already a .wav to 16kHz mono WAV first.
    if not path.lower().endswith(".wav"):
        path = _to_wav(path)
    raw = _get_allo_model().recognize(path, lang)
    phones = [p for p in raw.strip().split(" ") if p]
    return NormalizeAllosaurus(phones)


def _to_wav(src_path: str) -> str:
    """
    Convert an audio file (e.g. webm/opus from MediaRecorder) to 16kHz mono WAV
    using the ffmpeg binary bundled by imageio-ffmpeg (no system ffmpeg needed).
    Returns the path to the new WAV.
    """
    import subprocess
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    dst_path = src_path.rsplit(".", 1)[0] + ".converted.wav"
    subprocess.run(
        [ffmpeg, "-nostdin", "-y", "-i", src_path,
         "-ar", "16000", "-ac", "1", "-f", "wav", dst_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return dst_path


# --------------------------------------------------------------------------- #
# Reading extraction + per-kana segmentation of the expected phonemes          #
# --------------------------------------------------------------------------- #

# Small kana that combine with the preceding kana to form one mora.
_SMALL_KANA = set("ゃゅょゎァィゥェォャュョヮ")


def ReadingFromSentence(sentence: str) -> str:
    """
    Get the kana reading from a sentence.

    The web page passes furigana via <ruby>漢字<rt>かな</rt></ruby>. We take the
    <rt> readings for kanji and the surrounding kana as-is. If there are no ruby
    tags we assume the sentence is already kana.
    """
    # Replace each ruby group with its <rt> reading, keep non-ruby text as-is.
    def _rt(match):
        return match.group(1)

    # <ruby>BASE<rt>READING</rt></ruby> -> READING
    s = re.sub(r"<ruby>.*?<rt>(.*?)</rt></ruby>", _rt, sentence, flags=re.S)
    # Strip any remaining tags and punctuation that isn't kana.
    s = re.sub(r"<[^>]+>", "", s)
    return s


def SplitMoras(reading: str) -> list[str]:
    """Split a kana reading into mora units (small kana attach to the previous)."""
    moras: list[str] = []
    for ch in reading:
        if not _is_kana(ch):
            continue  # skip punctuation / spaces / stray chars
        if ch in _SMALL_KANA and moras:
            moras[-1] += ch
        else:
            moras.append(ch)
    return moras


def _is_kana(ch: str) -> bool:
    o = ord(ch)
    return 0x3040 <= o <= 0x30FF  # hiragana + katakana blocks


def BuildGroundTruth(sentence: str) -> list:
    """
    Build per-kana ground truth: [[mora, [phonemes]], ...].

    Phonemizes each mora on its own so every kana gets exactly its own phonemes
    (no cross-mora boundary drift). Cross-mora context like devoicing is a minor
    loss; clean per-kana grouping is worth more for the UI.
    """
    reading = ReadingFromSentence(sentence)
    moras = SplitMoras(reading)

    ground = []
    for mora in moras:
        ground.append([mora, GetJapanesePhonemes(mora)])
    return ground


# --------------------------------------------------------------------------- #
# PART 1 — Detection                                                           #
# --------------------------------------------------------------------------- #

def DetectPhoneme(audioPath: str | None = None,
                  sentence: str | None = None,
                  ground=None) -> dict:
    """
    Run allosaurus on the audio (`out`) and build per-kana `ground` from the
    sentence. `ground` may be passed in precomputed to skip G2P.
    """
    if ground is None:
        ground = BuildGroundTruth(sentence or "")

    out = RecognizeAllosaurus(audioPath) if audioPath else []
    return {"out": out, "ground": ground}


# --------------------------------------------------------------------------- #
# PART 2 — Align `out` vs ground truth, build analysis                          #
# --------------------------------------------------------------------------- #

def BuildAnalysis(detection: dict) -> list[dict]:
    """
    Align the detected `out` sequence against the flattened ground-truth
    phonemes, then slice the alignment back into per-kana entries.
    """
    out = detection["out"]
    ground_kana = detection["ground"]

    # Flatten ground truth, remembering which kana each ground phoneme belongs to.
    ref: list[str] = []
    ref_owner: list[int] = []
    for kana_idx, (_char, phonemes) in enumerate(ground_kana):
        for ph in phonemes:
            ref.append(ph)
            ref_owner.append(kana_idx)

    columns = align(ref, out)  # list of (ref_phoneme|None, out_phoneme|None)

    buckets: list[list[dict]] = [[] for _ in ground_kana]
    ref_pos = 0
    last_kana = 0
    for ref_ph, out_ph in columns:
        if ref_ph is not None:
            owner = ref_owner[ref_pos]
            last_kana = owner
            ref_pos += 1
            buckets[owner].append(_phoneme_entry(ref_ph, out_ph))
        else:
            # Insertion: extra detected sound, no ground. Attach to last kana.
            buckets[last_kana].append(_phoneme_entry("", out_ph))

    analysis: list[dict] = []
    for (char, _phonemes), entries in zip(ground_kana, buckets):
        ground = [e["ground"] for e in entries if e["ground"] != ""]
        perceived = [e["perceived"] for e in entries if e["perceived"] != ""]
        status = "correct" if all(e["correct"] for e in entries) else "wrong"
        analysis.append({
            "char": char,
            "groundPhonemes": ground,
            "perceivedPhonemes": perceived,
            "status": status,
            "phonemes": entries,
        })

    return analysis


def align(ref: list[str], out: list[str]) -> list[tuple]:
    """
    Needleman–Wunsch global alignment (matches notebook's AlignSequence
    tie-breaking: prefer diagonal, then deletion, then insertion).

    Returns a list of (ref_phoneme | None, out_phoneme | None) columns:
        (r, o)    substitution/match
        (r, None) deletion  — ref phoneme not produced
        (None, o) insertion — extra produced phoneme
    """
    n, m = len(ref), len(out)

    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i
    for j in range(1, m + 1):
        dp[0][j] = j

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == out[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,        # deletion
                dp[i][j - 1] + 1,        # insertion
                dp[i - 1][j - 1] + cost  # match/substitution
            )

    columns: list[tuple] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = 0 if ref[i - 1] == out[j - 1] else 1
            if dp[i][j] == dp[i - 1][j - 1] + cost:
                columns.append((ref[i - 1], out[j - 1]))
                i -= 1
                j -= 1
                continue
        if i > 0 and (j == 0 or dp[i][j] == dp[i - 1][j] + 1):
            columns.append((ref[i - 1], None))   # deletion
            i -= 1
        else:
            columns.append((None, out[j - 1]))   # insertion
            j -= 1

    columns.reverse()
    return columns


def _phoneme_entry(ground: str, perceived: str | None) -> dict:
    """Classify one aligned column into a contract phoneme entry."""
    if ground == "":  # insertion
        return {"ground": "", "perceived": perceived, "correct": False,
                "feedback": _feedback_insertion(perceived)}
    if perceived is None:  # deletion
        return {"ground": ground, "perceived": "", "correct": False,
                "feedback": _feedback_deletion(ground)}
    if ground == perceived:  # match
        return {"ground": ground, "perceived": perceived,
                "correct": True, "feedback": None}
    # substitution
    return {"ground": ground, "perceived": perceived, "correct": False,
            "feedback": _feedback_substitution(ground, perceived)}


# --------------------------------------------------------------------------- #
# Feedback generation. Start simple; refine per phoneme pair over time.        #
# --------------------------------------------------------------------------- #

def _feedback_substitution(ground: str, perceived: str) -> str:
    return (f"Expected /{ground}/ but heard /{perceived}/. "
            f"Focus on the /{ground}/ sound here.")


def _feedback_deletion(ground: str) -> str:
    return (f"The /{ground}/ sound was dropped. "
            f"Make sure to pronounce it clearly.")


def _feedback_insertion(perceived: str) -> str:
    return (f"An extra /{perceived}/ sound was added that doesn't belong here. "
            f"Try not to insert sounds between syllables.")


def Analyze(audioPath: str | None = None,
            sentence: str | None = None,
            ground=None) -> dict:
    detection = DetectPhoneme(audioPath, sentence, ground)
    analysis = BuildAnalysis(detection)
    return {
        "sentence": sentence or "",
        "analysis": analysis,
        "detected": detection["out"],
        "ground": detection["ground"]
    }


if __name__ == "__main__":
    audio = sys.argv[1] if len(sys.argv) > 1 else None
    sentence = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = Analyze(audio, sentence)
    

    print(json.dumps(result, ensure_ascii=False))
