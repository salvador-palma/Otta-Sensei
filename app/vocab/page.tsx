"use client"

import { upsertUser, upsertUserProgress } from "@/actions/user"
import VocabSession from "@/components/sys/vocab_session"
import { Button } from "@/components/ui/button"
import { Selector } from "@/components/ui/selector"
import { Sentence, Vocab, VocabCard } from "@/components/ui/vocab_card"
import { getReferences, getTrainableVocab, getVocab } from "@/db/queries"
import { randomInt } from "crypto"
import Link from "next/link"
import { useTransition } from "react"



const Menu = () => {
    const [pending, startTransition] = useTransition();

    const onClick = (lvl: number) => {
        if (pending) return;
        startTransition(() => {
            upsertUserProgress(lvl);
        })
    }
    
    return(
        <div className="flex flex-col items-center justify-center gap-y-10">
            <h1 className="text-2xl text-slate-900 font-semibold">What level would you like to practice?</h1>
            <div className="flex lg:flex-row flex-col gap-x-4 gap-y-1">
                <Selector onClick={() => onClick(5)} size="lgsquare" variant={pending ? "ghost" : "primary"} kanji="五" subtitle="N5"></Selector>
                <Selector onClick={() => onClick(4)} size="lgsquare" variant={pending ? "ghost" : "primary"} kanji="四" subtitle="N4"></Selector>
                <Selector onClick={() => onClick(3)} size="lgsquare" variant={pending ? "ghost" : "primary"} kanji="三" subtitle="N3"></Selector>
                <Selector onClick={() => onClick(2)} size="lgsquare" variant={pending ? "ghost" : "primary"} kanji="ニ" subtitle="N2"></Selector>
                <Selector onClick={() => onClick(1)} size="lgsquare" variant={pending ? "ghost" : "primary"} kanji="一" subtitle="N1"></Selector>
                
            </div>
            
        </div>
    )
}

export default Menu