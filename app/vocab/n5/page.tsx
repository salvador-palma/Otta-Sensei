import VocabSession from "@/components/sys/vocab_session"
import { Button } from "@/components/ui/button"
import { Selector } from "@/components/ui/selector"
import { Sentence, Vocab, VocabCard } from "@/components/ui/vocab_card"
import { getReferences, getTrainableVocab, getVocab } from "@/db/queries"
import { UserVocabProgress } from "@/db/schema"
import { randomInt } from "crypto"
import Link from "next/link"

const Menu = async() => {
    const allV = await getTrainableVocab(5) as [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[], typeof UserVocabProgress.$inferSelect][];
    
    return (
        <VocabSession allVocab={allV} />
    )
}

export default Menu