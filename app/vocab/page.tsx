import { Button } from "@/components/ui/button"
import { Selector } from "@/components/ui/selector"
import { Sentence, Vocab, VocabCard } from "@/components/ui/vocab_card"
import Link from "next/link"

const Menu = () => {

    const template = "<ruby>私<rt>わたし</rt></ruby>の<ruby>生<rt>い</rt></ruby>きているうちに______が<ruby>効力<rt>こうりょく</rt></ruby>を<ruby>持<rt>も</rt></ruby>つことは<ruby>無<rt>な</rt></ruby>いだろう。";


    const en_sent = "Communism will never be reached in my lifetime."
    const jp_sent = "私の生きているうちに共産主義が効力を持つことは無いだろう。"

    const sentence = new Sentence(template, en_sent, jp_sent)

    const word = new Vocab("共産主義", "きょうさんしゅぎ", 1, "Communism", "Noun", [sentence], [])
    return (
        <div className="size-full flex flex-col justify-between items-center pb-5">
            <VocabCard word={word}></VocabCard>
            <div className="actions flex flex-row w-full justify-center gap-x-4 lg:[&_Button]:max-w-[20%] [&_Button]:w-[40%]">
                <Button variant={"primary"}>Forgot :(</Button>
                <Button variant={"primary"}>Got it! :D</Button>
            </div>
            <div className="font-bold actions flex flex-row w-full text-center justify-center gap-x-4 lg:[&_span]:max-w-[20%] [&_span]:w-[40%] [&_span]:text-xs">
                <span>+10 min</span>
                <span>+1.4 months</span>
            </div>
        </div>
    )
}

export default Menu