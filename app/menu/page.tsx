import { upsertUser } from "@/actions/user"
import { Selector } from "@/components/ui/selector"
import { getUser } from "@/db/queries"
import Link from "next/link"





const Menu = async () => {
    
    upsertUser()
    console.log("User in menu page", await getUser())

    return(
        <div className="flex flex-col items-center justify-center gap-y-10">
            <h1 className="text-2xl text-slate-900 font-semibold">What will we practice today?</h1>
            <div className="flex lg:flex-row flex-col gap-x-4 gap-y-1">
                <Selector size="lgsquare" variant={"primary"} kanji="字" subtitle="Kanji"></Selector>
                <Link href="\vocab"><Selector size="lgsquare" variant={"primary"} kanji="語" subtitle="Vocab"></Selector></Link>
                <Selector size="lgsquare" variant={"ghost"} kanji="書" subtitle="Write"></Selector>
                <Selector size="lgsquare" variant={"ghost"} kanji="音" subtitle="Speak"></Selector>
                
            </div>
            
        </div>
    )
}

export default Menu