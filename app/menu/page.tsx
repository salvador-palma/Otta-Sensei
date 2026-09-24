import { upsertUser } from "@/actions/user"
import { Selector } from "@/components/ui/selector"
import { getUser } from "@/db/queries"
import { redirect } from "next/navigation"
import Link from "next/link"





const Menu = () => {

    upsertUser()

    const currentSession = 1

    const sessionKanji = ["前", "一", "二", "三", "四", "後"]
    const sessionTitles = ["Pre-train", "Train 1", "Train 2", "Train 3", "Train 4", "Post-train"]


    return (
        <div className="flex flex-col items-center justify-center gap-y-10">
            <h1 className="text-2xl text-slate-900 font-semibold">One more session?</h1>
            <div className="flex lg:flex-row flex-col gap-x-4 gap-y-1">


                {sessionKanji.map((kanji, index) => (
                    <Link key={index} href={`/menu/train?session=${index}`} className="flex flex-col items-center text-slate-500">
                        <Selector size="lgsquare" variant={"primary"} kanji={kanji} subtitle={sessionTitles[index]}></Selector>
                    </Link>
                ))}

                {/* <Link key={index} href={`/vocab/${5-index}`} className="flex flex-col items-center text-slate-500">
                        <LevelSelector card_nums={cards} size="lgsquare" variant={"primary"} kanji={kanji} subtitle={title}></LevelSelector>
                        <span className="lg:block hidden">{getPercentageCompleted(cards).toFixed(2)}%</span>
                    </Link> */}
                {/* <Selector size="lgsquare" variant={"primary"} kanji="字" subtitle="Kanji"></Selector>
                <Link href="\vocab"><Selector size="lgsquare" variant={"primary"} kanji="語" subtitle="Vocab"></Selector></Link>
                <Selector size="lgsquare" variant={"ghost"} kanji="書" subtitle="Write"></Selector>
                <Selector size="lgsquare" variant={"ghost"} kanji="音" subtitle="Speak"></Selector> */}

            </div>

        </div>
    )
}

export default Menu