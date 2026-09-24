"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "error";

export type UseRecorder = {
    status: RecorderStatus;
    /** Last permission/recording error, if any. */
    error: string | null;
    start: () => Promise<void>;
    /** Stops recording and resolves with the captured audio blob. */
    stop: () => Promise<Blob>;
};

/**
 * Thin wrapper around MediaRecorder. Captures microphone audio and returns it
 * as a Blob (webm/opus on most browsers). The API route is responsible for any
 * conversion the Python side needs (e.g. -> WAV).
 */
export function useRecorder(): UseRecorder {
    const [status, setStatus] = useState<RecorderStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const start = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorderRef.current = recorder;
            recorder.start();
            setStatus("recording");
        } catch (e) {
            setStatus("error");
            setError(
                e instanceof Error ? e.message : "Could not access the microphone."
            );
        }
    }, []);

    const stop = useCallback(() => {
        return new Promise<Blob>((resolve, reject) => {
            const recorder = recorderRef.current;
            if (!recorder) {
                reject(new Error("Not recording."));
                return;
            }

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                recorderRef.current = null;
                setStatus("idle");
                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    return { status, error, start, stop };
}
