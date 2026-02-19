"use client"; // This tells Next.js this is a Client Component

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button"; // Adjust based on your path
import { Vocab, VocabCard } from "@/components/ui/vocab_card"; // Adjust based on your path
import { updateVocabProgress } from "@/actions/user";
import { UserVocabProgress } from "@/db/schema";
import db from "@/db/drizzle";
import { addDays, intervaltoDate } from "@/lib/utils";

function isToday(date: Date) {
    const today = new Date()

    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    )
}

function VocabSession(
    {
        allVocab
    }:
        {
            allVocab: [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[], typeof UserVocabProgress.$inferSelect][]
        }) {

    const [pending, startTransition] = useTransition();
    const [deck, setDeck] = useState(allVocab);

    const currentWord: [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[], typeof UserVocabProgress.$inferSelect] = deck[0];

    const handleNext = (correct: boolean) => {

        if (pending) return;

        const client_result = updatedVocab(currentWord[2], correct);
        client_result.vocab_ID = currentWord[0].id;

        if (isToday(client_result.due_date)) {
            setDeck((prev) => {
                const remaining = prev.filter((item) => item[0].id !== currentWord[0].id);

                if (remaining.length === 0) return [currentWord];

                const minOffset = 5;
                const maxOffset = 10;
                const jump = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
                const insertionIndex = Math.min(jump, remaining.length);

                const newDeck = [...remaining];
                const newWord = currentWord
                newWord[2] = client_result;
                newDeck.splice(insertionIndex, 0, newWord);
                return newDeck;
            });
        } else {
            setDeck((prev) => prev.filter((item) => item[0].id != currentWord[0].id));
        }

        startTransition( async () => {
            try {
                updateVocabProgress(client_result);
            } catch (error) {
                console.error("Error updating vocab progress:", error);
            }
        })

        if (0 < allVocab.length - 1) {
            //setCurrentIndex((prev) => prev + 1);
        } else {
            alert("Session finished!");
        }
    };



    if (!currentWord) return <div>No more cards!</div>;
    const leaningStage = ["Soon", "In a bit", "Later"]
    return (
        <div className="size-full flex flex-col justify-between items-center pb-5">

            <VocabCard word={currentWord[0]} references={currentWord[1]} />

            <div className="flex flex-col w-full gap-y-2">
                <div className="actions flex flex-row w-full justify-center gap-x-4 lg:[&_Button]:max-w-[20%] [&_Button]:w-[40%]">
                    <Button variant={"primary"} onClick={() => handleNext(false)}>Forgot :(</Button>
                    <Button variant={"primary"} onClick={() => handleNext(true)}>Got it! :D</Button>
                </div>

                <div className="font-bold actions flex flex-row w-full text-center justify-center gap-x-4 lg:[&_span]:max-w-[20%] [&_span]:w-[40%] [&_span]:text-xs">
                    <span>Soon</span>
                    <span>{currentWord[2].interval == 0 && currentWord[2].repetition < 2 ? leaningStage[currentWord[2].repetition + 1] : intervaltoDate(currentWord[2].interval, currentWord[2].easiness_factor)}</span>
                </div>

                <div className="font-bold actions flex flex-row w-full text-center justify-center gap-x-4  [&_span]:text-xs text-slate-500">
                    <span className={currentWord[2].stage == "new" ? "text-slate-900" : ""}>
                        {deck.filter(item => item[2].stage == "new").length}<br />new
                    </span>
                    <span className={currentWord[2].stage == "learning" || currentWord[2].stage == "relearning" ? "text-slate-900" : "text-slate-500"}>
                        {deck.filter(item => item[2].stage == "learning" || item[2].stage == "relearning").length}<br />learning
                    </span>
                    <span className={currentWord[2].stage != "new" && currentWord[2].stage != "learning" && currentWord[2].stage != "relearning" ? "text-slate-900" : "text-slate-500"}>
                        {deck.filter(item => item[2].stage != "new" && item[2].stage != "learning" && item[2].stage != "relearning").length}<br />review
                    </span>
                </div>
            </div>
        </div>
    );
}


function updatedVocab(progress: typeof UserVocabProgress.$inferSelect | null, correct: boolean): typeof UserVocabProgress.$inferSelect {

    //New Entry
    if (progress == null) {
        if (correct) {
            return {
                interval: 0,
                repetition: 1,
                easiness_factor: 2.55,
                stage: "learning",
                due_date: addDays(0)
            } as typeof UserVocabProgress.$inferSelect
        } else {
            return {
                interval: 0,
                repetition: 0,
                easiness_factor: 2.3,
                stage: "learning",
                due_date: addDays(0)
            } as typeof UserVocabProgress.$inferSelect
        }
    }

    //Learning or New Card
    if (progress.stage == "learning" || progress.stage == "relearning" || progress.stage == "new") {

        progress.stage = progress.stage == "new" ? "learning" : progress.stage;

        if (correct) {
            const newRepetition = progress.repetition + 1;
            const newStage = newRepetition >= 3 ? "apprentice" : progress.stage;
            const newInterval = newRepetition >= 3 ? 1 : 0;

            return {
                interval: newInterval,
                repetition: newRepetition,
                easiness_factor: 2.5,
                stage: newStage,
                due_date: addDays(newInterval)
            } as typeof UserVocabProgress.$inferSelect
        }
        else {
            return {
                interval: progress.interval,
                repetition: 0,
                easiness_factor: progress.easiness_factor,
                stage: progress.stage,
                due_date: progress.due_date
            } as typeof UserVocabProgress.$inferSelect
        }

        //Review Card
    } else {
        if (correct) {
            const newInterval = progress.repetition == 1 ? 6 : Math.ceil(progress.interval * progress.easiness_factor);
            const newRepetition = progress.repetition + 1;
            const newStage = newInterval >= 21 ? newInterval >= 93 ? "master" : "mature" : "apprentice";
            const newEasinessFactor = progress.easiness_factor + 0.1;

            return {
                interval: newInterval,
                repetition: newRepetition,
                easiness_factor: newEasinessFactor,
                stage: newStage,
                due_date: addDays(newInterval)
            } as typeof UserVocabProgress.$inferSelect
        }
        else {
            const newEasinessFactor = Math.max(1.3, progress.easiness_factor - 0.5);

            return {
                interval: 0,
                repetition: 0,
                easiness_factor: newEasinessFactor,
                stage: "relearning",
                due_date: addDays(0)
            } as typeof UserVocabProgress.$inferSelect
        }
    }



}



export default VocabSession;
