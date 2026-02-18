"use client"; // This tells Next.js this is a Client Component

import { useState } from "react";
import { Button } from "@/components/ui/button"; // Adjust based on your path
import { Vocab, VocabCard } from "@/components/ui/vocab_card"; // Adjust based on your path

function VocabSession(
    { 
        allVocab
    }:
    {
        allVocab: [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[]][]
    }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Get the current word based on state
    const currentWord : [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[]] = allVocab[currentIndex];

    const handleNext = () => {
        if (currentIndex < allVocab.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            alert("Session finished!");
        }
    };

    if (!currentWord) return <div>No more cards!</div>;

    return (
        <div className="size-full flex flex-col justify-between items-center pb-5">
            {/* You might need to fetch references inside VocabCard or pass them in */}
            <VocabCard word={currentWord[0]} references={currentWord[1]} />

            <div className="flex flex-col w-full gap-y-2">
                <div className="actions flex flex-row w-full justify-center gap-x-4 lg:[&_Button]:max-w-[20%] [&_Button]:w-[40%]">
                    <Button variant={"primary"} onClick={handleNext}>Forgot :(</Button>
                    <Button variant={"primary"} onClick={handleNext}>Got it! :D</Button>
                </div>

                <div className="font-bold actions flex flex-row w-full text-center justify-center gap-x-4 lg:[&_span]:max-w-[20%] [&_span]:w-[40%] [&_span]:text-xs">
                    <span>+10 min</span>
                    <span>+1.4 months</span>
                </div>
            </div>
        </div>
    );
}

export default VocabSession;