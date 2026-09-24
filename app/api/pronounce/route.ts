import { NextRequest, NextResponse } from "next/server";
import { PronunciationResult } from "@/lib/pronunciation/types";

// The analyzer is a separate Python server (python/server.py) that keeps the
// XLSR model loaded between requests. Start it with `npm run analyzer`.
const ANALYZER_URL = process.env.ANALYZER_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const audio = form.get("audio");
    const sentence = form.get("sentence");
    const ipa = form.get("ipa");
    const feature = form.get("feature");

    if (!(audio instanceof Blob)) {
        return NextResponse.json({ error: "Missing audio." }, { status: 400 });
    }
    if (typeof sentence !== "string" || typeof ipa !== "string") {
        return NextResponse.json({ error: "Missing sentence or IPA transcription." }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append("audio", audio, "utterance.webm");
    upstream.append("sentence", sentence);
    upstream.append("ipa", ipa);
    if (typeof feature === "string") upstream.append("feature", feature);

    let res: Response;
    try {
        res = await fetch(`${ANALYZER_URL}/analyze`, { method: "POST", body: upstream });
    } catch {
        return NextResponse.json(
            { error: "The pronunciation analyzer is not running. Start it with `npm run analyzer`." },
            { status: 503 }
        );
    }

    const body = (await res.json()) as PronunciationResult & { error?: string };
    if (!res.ok || body.error) {
        return NextResponse.json({ error: body.error ?? "Analysis failed." }, { status: res.ok ? 500 : res.status });
    }

    return NextResponse.json(body);
}
