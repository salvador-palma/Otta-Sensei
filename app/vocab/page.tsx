import { upsertUserProgress } from "@/actions/user"
import { LevelSelector } from "@/components/ui/level_selector";
import { Selector } from "@/components/ui/selector"
import { getVocabState } from "@/db/queries";
import Link from "next/link";

const Menu = async () => {

    await upsertUserProgress(1);
    await upsertUserProgress(2);
    await upsertUserProgress(3);
    await upsertUserProgress(4);
    await upsertUserProgress(5);

    const lvl5cardscount = await getVocabState(5)
    const lvl4cardscount = await getVocabState(4)
    const lvl3cardscount = await getVocabState(3)
    const lvl2cardscount = await getVocabState(2)
    const lvl1cardscount = await getVocabState(1)

    const getPercentageCompleted = (card_nums: [number, string][]) => {
        const total = card_nums.reduce((acc, [num, _]) => {
            if (isNaN(num)) {
                return acc;
            }
            return acc + num;
        }, 0);
        const completed = total - card_nums[card_nums.length - 1][0];
        return total > 0 ? (completed / total) * 100 : 0;
    }


    const cd5: [number, string][] = [[lvl5cardscount["learning"] + lvl5cardscount["relearning"], "#17cbe3"], [lvl5cardscount["apprentice"], "#13bf58"], [lvl5cardscount["mature"], "#06692e"], [lvl5cardscount["master"], "#ffb300"], [lvl5cardscount["new"], "#F53366"]]
    const cd4: [number, string][] = [[lvl4cardscount["learning"] + lvl4cardscount["relearning"], "#17cbe3"], [lvl4cardscount["apprentice"], "#13bf58"], [lvl4cardscount["mature"], "#06692e"], [lvl4cardscount["master"], "#ffb300"], [lvl4cardscount["new"], "#F53366"]]
    const cd3: [number, string][] = [[lvl3cardscount["learning"] + lvl3cardscount["relearning"], "#17cbe3"], [lvl3cardscount["apprentice"], "#13bf58"], [lvl3cardscount["mature"], "#06692e"], [lvl3cardscount["master"], "#ffb300"], [lvl3cardscount["new"], "#F53366"]]
    const cd2: [number, string][] = [[lvl2cardscount["learning"] + lvl2cardscount["relearning"], "#17cbe3"], [lvl2cardscount["apprentice"], "#13bf58"], [lvl2cardscount["mature"], "#06692e"], [lvl2cardscount["master"], "#ffb300"], [lvl2cardscount["new"], "#F53366"]]
    const cd1: [number, string][] = [[lvl1cardscount["learning"] + lvl1cardscount["relearning"], "#17cbe3"], [lvl1cardscount["apprentice"], "#13bf58"], [lvl1cardscount["mature"], "#06692e"], [lvl1cardscount["master"], "#ffb300"], [lvl1cardscount["new"], "#F53366"]]

    const data : [[number, string][], string, string][] = [[cd5, "五", "N5"], [cd4, "四", "N4"], [cd3, "三", "N3"], [cd2, "ニ", "N2"], [cd1, "一", "N1"]]
    return (
        <div className="flex flex-col items-center justify-center gap-y-10">
            <h1 className="text-2xl text-slate-900 font-semibold">What level would you like to practice?</h1>
            <div className="flex lg:flex-row flex-col gap-x-4 gap-y-1">
                {data.map(([cards, kanji, title], index) => (
                    <Link key={index} href={`/vocab/${5-index}`} className="flex flex-col items-center text-slate-500">
                        <LevelSelector card_nums={cards} size="lgsquare" variant={"primary"} kanji={kanji} subtitle={title}></LevelSelector>
                        <span className="lg:block hidden">{getPercentageCompleted(cards).toFixed(2)}%</span>
                    </Link>
                ))}

            

            </div>

        </div>
    )
}

export default Menu