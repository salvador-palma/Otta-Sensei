import { upsertUserProgress } from "@/actions/user"
import SpeakSession from "@/components/sys/speak_session";
import { LevelSelector } from "@/components/ui/level_selector";
import { Selector } from "@/components/ui/selector"
import { getVocabState } from "@/db/queries";
import Link from "next/link";

const Menu = async () => {

    const sentences = [
        "<ruby>最近<rt>さいきん</rt></ruby><ruby>札幌<rt>さっぽろ</rt></ruby>は<ruby>物価<rt>ぶっか</rt></ruby>が<ruby>高<rt>た</rt></ruby>いと<ruby>聞<rt>き</rt></ruby>いた",
        "この鉛筆は誰のものですか？",
        "明日学校へ行きたくない",
        "おはようございます",
        "庭には二羽鶏がいる裏庭にも二羽鶏がいる",
    ]
    //<ruby>今日<rt>きょう</rt></ruby>、<ruby>会<rt>あ</rt></ruby>うよ。


    return (

        
        <div className="flex flex-col items-center justify-center gap-y-10">
            <SpeakSession allSentences={sentences}></SpeakSession>
        
            

        </div>
    )
}

export default Menu