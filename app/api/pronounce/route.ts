import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { PronunciationResult } from "@/lib/pronunciation/types";

// Spawning a child process needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";
const SCRIPT_PATH = path.join(process.cwd(), "python", "analyze.py");

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const audio = form.get("audio");
    const sentence = (form.get("sentence") as string) ?? "";

    if (!(audio instanceof Blob)) {
        return NextResponse.json({ error: "Missing audio." }, { status: 400 });
    }

    // Persist the upload so the Python script can read it from disk.
    const dir = await mkdtemp(path.join(tmpdir(), "otta-speak-"));
    const audioPath = path.join(dir, "utterance.webm");
    try {
        await writeFile(audioPath, Buffer.from(await audio.arrayBuffer()));

        const result = await runAnalyzer(audioPath, sentence);
        return NextResponse.json(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : "Analysis failed.";
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        // Best-effort cleanup of the temp dir.
        await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

function runAnalyzer(
    audioPath: string,
    sentence: string
): Promise<PronunciationResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(PYTHON_BIN, [SCRIPT_PATH, audioPath, sentence], {
            // Ensure Python emits UTF-8 (Windows defaults to cp1252 and would
            // crash when printing Japanese).
            env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (d) => (stdout += d.toString()));
        child.stderr.on("data", (d) => (stderr += d.toString()));

        child.on("error", reject);
        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `analyze.py exited with code ${code}`));
                return;
            }
            try {
                const parsed = JSON.parse(stdout) as PronunciationResult & {
                    error?: string;
                };
                // The script exits 0 but may report a dependency/runtime error.
                if (parsed.error) {
                    reject(new Error(parsed.error));
                    return;
                }
                resolve(parsed);
            } catch {
                reject(new Error(`Could not parse analyzer output: ${stdout}`));
            }
        });
    });
}
