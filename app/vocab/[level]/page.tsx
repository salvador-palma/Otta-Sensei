import VocabSession from "@/components/sys/vocab_session"
import { Sentence, Vocab, VocabCard } from "@/components/ui/vocab_card"
import { getReferences, getTrainableVocab, getVocab } from "@/db/queries"
import { UserVocabProgress } from "@/db/schema"
import { notFound } from "next/navigation"

interface PageProps {
  params: {
    level: string
  }
}

const Menu = async ({ params }: PageProps) => {
    const resolvedParams = await params; 
    const level = parseInt(resolvedParams.level);

    if (isNaN(level) || level < 1 || level > 5) {
        notFound();
    }
    
    const allV = await getTrainableVocab(level) as [typeof Vocab.$inferSelect, typeof Vocab.$inferSelect[], typeof UserVocabProgress.$inferSelect][];
    
    return (
        <VocabSession allVocab={allV} />
    )
}

export default Menu