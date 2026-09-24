"""
analyze.py — Pronunciation analysis (fine-tuned XLSR + Japanese Hubert).

Two parts:

  1. DetectPhoneme() -> Runs a phoneme recognizer on the audio (`out`) and
                        builds the per-kana ground truth (`ground`) from the
                        sentence's `ipa_transcription` (stored in the DB, written
                        in the same notation the XLSR model was trained on).

                        Models are mixed per phoneme (PHONEME_MODEL): the flap ɾ
                        is judged by the fine-tuned XLSR, everything else by the
                        prj-beatrice Hubert. XLSR only runs when a ɾ is expected.
                        Hubert emits OpenJTalk labels (cl, N, I/U, ky, ...), which
                        are converted to the XLSR notation with the same rules
                        used to build the training labels (PhonemeSequence2IPA).

  2. BuildAnalysis() -> Aligns each model's output against the same ground
                        truth, takes every expected phoneme's verdict from the
                        model assigned to it, then slices the result into the
                        per-kana analysis array the frontend consumes.

The recognizer gives ONLY a flat detected phoneme sequence (`out`) with no
alignment. BuildAnalysis() aligns it against the ground truth itself
(edit-distance / Needleman–Wunsch) and classifies each column as:

    match        ground phoneme == detected phoneme     -> correct
    substitution ground replaced by a different sound    -> wrong
    deletion     ground phoneme missing from `out`       -> wrong, perceived ""
    insertion    extra detected sound with no ground     -> wrong (extra sound)

IPA TRANSCRIPTION FORMAT
------------------------
One group per kana character of the reading, separated by "|". Phonemes inside a
group are written back to back and split against the model's vocabulary:
    とうきょうはぶっかがたかい -> "to|o|kʲ|jo|o|wa|bɯ|kː|a|ɡa|ta|ka|i"
An ASCII ":" is accepted as the length mark "ː".

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

torch/transformers are imported lazily so the ground-truth parsing and the
alignment can be used and tested without loading the model.
"""

import json
import os
import re
import sys

MODEL_DIR = os.environ.get(
    "XLSR_MODEL_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "xlsr-jp-us-ipa"),
)
HUBERT_MODEL_ID = os.environ.get("HUBERT_MODEL_ID", "prj-beatrice/japanese-hubert-base-phoneme-ctc")
SAMPLE_RATE = 16000

# Which recognizer judges each expected phoneme. Anything not listed is judged by
# the primary model, which also decides extra (inserted) sounds.
# Hubert only knows Japanese sounds, so it cannot hear an English ɹ/l in place of
# the flap; the fine-tuned XLSR can.
PHONEME_MODEL = {
    "ɾ": "xlsr",
}
PRIMARY_MODEL = "hubert"


def ModelForPhoneme(phoneme: str) -> str:
    return PHONEME_MODEL.get(phoneme, PRIMARY_MODEL)


# --------------------------------------------------------------------------- #
# Model vocabulary                                                             #
# --------------------------------------------------------------------------- #

_inventory: list[str] | None = None


def PhonemeInventory() -> list[str]:
    """Phoneme tokens the model can emit, longest first (for greedy splitting)."""
    global _inventory
    if _inventory is None:
        with open(os.path.join(MODEL_DIR, "vocab.json"), encoding="utf-8") as f:
            vocab = json.load(f)
        tokens = [t for t in vocab if t != "|" and not (t.startswith("[") and t.endswith("]"))]
        _inventory = sorted(tokens, key=len, reverse=True)
    return _inventory


# --------------------------------------------------------------------------- #
# Recognizer: fine-tuned XLSR, ported from Fine-Tuning/Testing.ipynb           #
# --------------------------------------------------------------------------- #

_model = None
_processor = None


def LoadModel():
    """Load the model + processor once. Safe to call repeatedly."""
    global _model, _processor
    if _model is None:
        import torch
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

        _processor = Wav2Vec2Processor.from_pretrained(MODEL_DIR)
        _model = Wav2Vec2ForCTC.from_pretrained(MODEL_DIR)
        _model.to("cuda" if torch.cuda.is_available() else "cpu")
        _model.eval()
    return _model, _processor


def IdsToIpa(ids, group_tokens: bool = True) -> list[str]:
    """
    CTC ids -> phoneme list. Same as training: the tokenizer's decode() would
    glue multi-char phonemes together, so ids are mapped to tokens directly and
    the "|" phoneme delimiter and special tokens are dropped.
    """
    _, processor = LoadModel()
    tokenizer = processor.tokenizer
    special = {tokenizer.pad_token, tokenizer.unk_token,
               getattr(tokenizer, "bos_token", None), getattr(tokenizer, "eos_token", None)}
    delim = tokenizer.word_delimiter_token

    ids = [int(i) for i in ids]
    if group_tokens:
        ids = [i for j, i in enumerate(ids) if j == 0 or i != ids[j - 1]]

    tokens = tokenizer.convert_ids_to_tokens(ids)
    return [t for t in tokens if t not in special and t != delim]


def RecognizeXLSR(path: str) -> list[str]:
    import torch

    model, processor = LoadModel()
    audio = _read_audio(path)

    inputs = processor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values.to(model.device)
    with torch.no_grad():
        logits = model(inputs).logits
    pred_ids = torch.argmax(logits, dim=-1)[0]

    return IdsToIpa(pred_ids, group_tokens=True)


def _read_audio(path: str):
    """The browser records webm/opus; always normalise to 16kHz mono float32."""
    import soundfile as sf

    audio, _sr = sf.read(_to_wav(path), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio


# --------------------------------------------------------------------------- #
# Recognizer: prj-beatrice Hubert, ported from RecognizerModel.ipynb           #
# --------------------------------------------------------------------------- #

_hubert_model = None
_hubert_processor = None

# Hubert tokens that are not phonemes
_HUBERT_SKIP = {"PAD", "UNK", "SOS", "EOS", "pau", "sil"}


def LoadHubert():
    """Load the Hubert model + processor once (downloaded from Hugging Face)."""
    global _hubert_model, _hubert_processor
    if _hubert_model is None:
        import torch
        from transformers import HubertForCTC, Wav2Vec2Processor

        _hubert_processor = Wav2Vec2Processor.from_pretrained(HUBERT_MODEL_ID)
        _hubert_model = HubertForCTC.from_pretrained(HUBERT_MODEL_ID)
        _hubert_model.to("cuda" if torch.cuda.is_available() else "cpu")
        _hubert_model.eval()
    return _hubert_model, _hubert_processor


def RecognizeHubert(path: str) -> list[str]:
    import numpy as np
    import torch

    model, processor = LoadHubert()
    audio = _read_audio(path)
    # Same padding as the notebook: 1s of silence before, 0.5s after
    audio = np.concatenate([np.zeros(SAMPLE_RATE, dtype=np.float32), audio,
                            np.zeros(SAMPLE_RATE // 2, dtype=np.float32)])

    inputs = processor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values.to(model.device)
    with torch.no_grad():
        logits = model(inputs).logits
    ids = torch.argmax(logits, dim=-1)[0].tolist()

    # CTC: collapse repeats, then drop blank/special/silence tokens
    ids = [i for j, i in enumerate(ids) if j == 0 or i != ids[j - 1]]
    labels = [t for t in processor.tokenizer.convert_ids_to_tokens(ids) if t not in _HUBERT_SKIP]

    return LabelsToIpa(labels)


def LabelsToIpa(labels: list[str]) -> list[str]:
    """
    OpenJTalk labels -> XLSR notation. Same rules as PhonemeSequence2IPA in
    Fine-Tuning/DataCollection.ipynb (how the JVS training labels were built),
    except that palatalized aggregates keep their mapped consonant (ry -> ɾ j).
    """
    LABEL_TO_IPA = {
        "j": "dʑ", "y": "j", "u": "ɯ", "U": "ɯ̥", "I": "i̥",
        "g": "ɡ", "r": "ɾ", "sh": "ɕ", "ch": "tɕ", "f": "ɸ",
    }

    # Split aggregates (ky -> k y, kw -> k w), then map to IPA
    split: list[str] = []
    for label in labels:
        if len(label) >= 2 and label[-1] in ("y", "w") and label not in ("sh", "ch", "ts"):
            split += [label[:-1], label[-1]]
        else:
            split.append(label)
    phonemes = [LABEL_TO_IPA.get(p, p) for p in split]

    # Long nasals: n n -> nː, m m -> mː
    result: list[str] = []
    for p in phonemes:
        if result and result[-1] == p and p in ("n", "m"):
            result[-1] = p + "ː"
        else:
            result.append(p)
    phonemes = result

    # Geminates: cl + C -> Cː (a trailing cl has nothing to lengthen)
    result = []
    for p in phonemes:
        if result and result[-1] == "cl":
            result[-1] = p + "ː"
        else:
            result.append(p)
    phonemes = [p for p in result if p != "cl"]

    # Coarticulation: palatalization and moraic-nasal assimilation
    result = phonemes[:1]
    for i in range(1, len(phonemes)):
        p = phonemes[i]
        if p == "j" and result[-1] == "h":
            result[-1] = "ç"
        elif p == "j" and result[-1] == "k":
            result[-1] = "kʲ"
        elif p == "j" and result[-1] == "ɡ":
            result[-1] = "ɡʲ"
        elif p == "m" and result[-1] == "N":
            result[-1] = "mː"
            continue
        elif p in ("k", "ɡ") and result[-1] == "N":
            result[-1] = "ŋ"
        elif p in ("b", "p") and result[-1] == "N":
            result[-1] = "m"
        elif result[-1] == "N":
            result[-1] = "n"
        result.append(p)

    # A final moraic nasal
    if result and result[-1] == "N":
        result[-1] = "ɴ"

    return result


RECOGNIZERS = {
    "xlsr": RecognizeXLSR,
    "hubert": RecognizeHubert,
}


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
         "-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "wav", dst_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return dst_path


# --------------------------------------------------------------------------- #
# Ground truth: kana of the reading + the sentence's ipa_transcription         #
# --------------------------------------------------------------------------- #

def ReadingFromSentence(sentence: str) -> str:
    """
    Get the kana reading from a sentence.

    The web page passes furigana via <ruby>漢字<rt>かな</rt></ruby>. We take the
    <rt> readings for kanji and the surrounding kana as-is. If there are no ruby
    tags we assume the sentence is already kana.
    """
    # <ruby>BASE<rt>READING</rt></ruby> -> READING
    s = re.sub(r"<ruby>.*?<rt>(.*?)</rt></ruby>", lambda m: m.group(1), sentence, flags=re.S)
    # Strip any remaining tags.
    return re.sub(r"<[^>]+>", "", s)


def SplitKana(reading: str) -> list[str]:
    """Kana characters of the reading, one per IPA group (punctuation skipped)."""
    return [ch for ch in reading if _is_kana(ch)]


def _is_kana(ch: str) -> bool:
    o = ord(ch)
    return 0x3040 <= o <= 0x30FF  # hiragana + katakana blocks


def SplitPhonemes(group: str) -> list[str]:
    """Split one kana's IPA ("kʲ", "jo", "kː") into model tokens, longest match first."""
    # ASCII look-alikes: ":" for the length mark, "g" for the IPA ɡ of the Japanese labels
    group = group.replace(":", "ː").replace("g", "ɡ").replace(" ", "")
    inventory = PhonemeInventory()

    phonemes, i = [], 0
    while i < len(group):
        token = next((t for t in inventory if group.startswith(t, i)), None)
        if token is None:
            raise ValueError(f"'{group[i:]}' in IPA group '{group}' is not a phoneme the model knows")
        phonemes.append(token)
        i += len(token)
    return phonemes


def BuildGroundTruth(sentence: str, ipa: str) -> list:
    """Build per-kana ground truth: [[kana, [phonemes]], ...]."""
    kana = SplitKana(ReadingFromSentence(sentence))
    groups = ipa.strip().split("|")

    if len(kana) != len(groups):
        raise ValueError(
            f"Reading has {len(kana)} kana ({''.join(kana)}) but the IPA transcription "
            f"has {len(groups)} groups ({ipa})"
        )

    return [[char, SplitPhonemes(group)] for char, group in zip(kana, groups)]


# --------------------------------------------------------------------------- #
# PART 1 — Detection                                                           #
# --------------------------------------------------------------------------- #

def DetectPhoneme(audioPath: str | None = None,
                  sentence: str | None = None,
                  ipa: str | None = None,
                  ground=None) -> dict:
    """
    Build per-kana `ground` from the sentence and its IPA transcription, then run
    every recognizer the expected phonemes need (`outputs`: model -> phonemes).
    `ground` may be passed in precomputed.
    """
    if ground is None:
        ground = BuildGroundTruth(sentence or "", ipa or "")

    ref = [ph for _char, phonemes in ground for ph in phonemes]
    models = [PRIMARY_MODEL] + sorted({ModelForPhoneme(ph) for ph in ref} - {PRIMARY_MODEL})

    outputs = {model: RECOGNIZERS[model](audioPath) if audioPath else [] for model in models}
    return {"outputs": outputs, "ground": ground}


# --------------------------------------------------------------------------- #
# PART 2 — Align each model's output vs ground truth, merge, build analysis     #
# --------------------------------------------------------------------------- #

def BuildAnalysis(detection: dict) -> list[dict]:
    """
    Align every model's output against the same flattened ground-truth phonemes.
    Because the reference is shared, slot i means the same expected phoneme in
    every alignment, so each slot takes its verdict from the model assigned to
    that phoneme (PHONEME_MODEL). Extra (inserted) sounds come from the primary
    model only. The result is sliced back into per-kana entries.
    """
    outputs: dict[str, list[str]] = detection["outputs"]
    ground_kana = detection["ground"]

    # Flatten ground truth, remembering which kana each ground phoneme belongs to.
    ref: list[str] = []
    ref_owner: list[int] = []
    for kana_idx, (_char, phonemes) in enumerate(ground_kana):
        for ph in phonemes:
            ref.append(ph)
            ref_owner.append(kana_idx)

    # model -> what it perceived in each ground slot (None = dropped)
    perceived_by_model = {model: _perceived_per_slot(align(ref, out), len(ref))
                          for model, out in outputs.items()}

    buckets: list[list[dict]] = [[] for _ in ground_kana]
    ref_pos = 0
    last_kana = 0
    # The primary model's alignment fixes the order and where insertions go
    for ref_ph, out_ph in align(ref, outputs[PRIMARY_MODEL]):
        if ref_ph is not None:
            model = ModelForPhoneme(ref_ph)
            if model not in perceived_by_model:
                model = PRIMARY_MODEL
            owner = ref_owner[ref_pos]
            last_kana = owner
            buckets[owner].append(_phoneme_entry(ref_ph, perceived_by_model[model][ref_pos], model))
            ref_pos += 1
        else:
            # Insertion: extra detected sound, no ground. Attach to last kana.
            buckets[last_kana].append(_phoneme_entry("", out_ph, PRIMARY_MODEL))

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


def _perceived_per_slot(columns: list[tuple], n_ref: int) -> list[str | None]:
    """Alignment columns -> what was perceived in each ground slot (None = dropped)."""
    perceived: list[str | None] = [None] * n_ref
    ref_pos = 0
    for ref_ph, out_ph in columns:
        if ref_ph is not None:
            perceived[ref_pos] = out_ph
            ref_pos += 1
    return perceived


# --------------------------------------------------------------------------- #
# Weighted alignment                                                           #
# --------------------------------------------------------------------------- #

INDEL_COST = 1.0

# Substitutions within a family are cheaper, so a messy output still lands in
# the right slot (an English ɹ aligns with the expected flap instead of shifting
# the alignment). Basic classes for now; SubstitutionCost is the single place to
# replace with an IPA feature distance later.
SIMILAR_COST = 0.5
_VOWEL_CHARS = set("aeiouɑɯəɛɔɪʊʌæɐɚɝøœɵɨʉ")
_RHOTICS = {"ɾ", "ɹ", "r", "l", "d", "ɻ", "ɽ", "ɚ", "ɝ"}


def _base(ph: str) -> str:
    """Strip length and devoicing marks: kː -> k, ɯ̥ -> ɯ."""
    return ph.replace("ː", "").replace("̥", "")


def _is_vowel(ph: str) -> bool:
    return bool(ph) and ph[0] in _VOWEL_CHARS


def SubstitutionCost(expected: str, perceived: str) -> float:
    """Cost of aligning `perceived` into the slot of `expected` (0 = identical)."""
    if expected == perceived:
        return 0.0
    if _base(expected) == _base(perceived):  # same sound, wrong length/voicing
        return SIMILAR_COST
    if expected in _RHOTICS and perceived in _RHOTICS:
        return SIMILAR_COST
    if _is_vowel(expected) and _is_vowel(perceived):
        return SIMILAR_COST
    return 1.0


def align(ref: list[str], out: list[str]) -> list[tuple]:
    """
    Weighted Needleman–Wunsch global alignment. Substitutions cost
    SubstitutionCost(), insertions/deletions INDEL_COST. Ties prefer diagonal,
    then deletion, then insertion (as the notebook's AlignSequence).

    Returns a list of (ref_phoneme | None, out_phoneme | None) columns:
        (r, o)    substitution/match
        (r, None) deletion  — ref phoneme not produced
        (None, o) insertion — extra produced phoneme
    """
    DIAG, DEL, INS = 0, 1, 2
    n, m = len(ref), len(out)

    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    move = [[DIAG] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i * INDEL_COST
        move[i][0] = DEL
    for j in range(1, m + 1):
        dp[0][j] = j * INDEL_COST
        move[0][j] = INS

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            # Order matters for ties: first listed wins
            options = [
                (dp[i - 1][j - 1] + SubstitutionCost(ref[i - 1], out[j - 1]), DIAG),
                (dp[i - 1][j] + INDEL_COST, DEL),
                (dp[i][j - 1] + INDEL_COST, INS),
            ]
            dp[i][j], move[i][j] = min(options, key=lambda o: o[0])

    columns: list[tuple] = []
    i, j = n, m
    while i > 0 or j > 0:
        if move[i][j] == DIAG:
            columns.append((ref[i - 1], out[j - 1]))
            i -= 1
            j -= 1
        elif move[i][j] == DEL:
            columns.append((ref[i - 1], None))
            i -= 1
        else:
            columns.append((None, out[j - 1]))
            j -= 1

    columns.reverse()
    return columns


def _phoneme_entry(ground: str, perceived: str | None, model: str) -> dict:
    """Classify one aligned column into a contract phoneme entry."""
    if ground == "":  # insertion
        return {"ground": "", "perceived": perceived, "correct": False,
                "feedback": _feedback_insertion(perceived), "model": model}
    if perceived is None:  # deletion
        return {"ground": ground, "perceived": "", "correct": False,
                "feedback": _feedback_deletion(ground), "model": model}
    if ground == perceived:  # match
        return {"ground": ground, "perceived": perceived,
                "correct": True, "feedback": None, "model": model}
    # substitution
    return {"ground": ground, "perceived": perceived, "correct": False,
            "feedback": _feedback_substitution(ground, perceived), "model": model}


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
            ipa: str | None = None,
            feature: str | None = None,
            ground=None) -> dict:
    """`feature` does not affect the analysis; it is echoed back for logging."""
    detection = DetectPhoneme(audioPath, sentence, ipa, ground)
    analysis = BuildAnalysis(detection)
    return {
        "sentence": sentence or "",
        "feature": feature,
        "analysis": analysis,
        "detected": detection["outputs"],  # model -> raw phoneme sequence
        "ground": detection["ground"],
    }


if __name__ == "__main__":
    # Manual test: python analyze.py <audio> "<sentence>" "<ipa_transcription>" <FEATURE>
    sys.stdout.reconfigure(encoding="utf-8")
    audio = sys.argv[1] if len(sys.argv) > 1 else None
    sentence = sys.argv[2] if len(sys.argv) > 2 else None
    ipa = sys.argv[3] if len(sys.argv) > 3 else None
    feature = sys.argv[4] if len(sys.argv) > 4 else None

    print(json.dumps(Analyze(audio, sentence, ipa, feature), ensure_ascii=False))
