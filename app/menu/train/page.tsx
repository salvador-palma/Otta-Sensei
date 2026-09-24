
import SpeakSession from "@/components/sys/speak_session"
import { getSentences} from "@/db/queries"
import { notFound } from "next/navigation"

interface PageProps {
  searchParams: Promise<{
    session?: string
  }>
}

const Menu = async ({ searchParams }: PageProps) => {
    const resolvedParams = await searchParams;
    const level = Number(resolvedParams.session);

    const sentences = await getSentences(level);

    if (!sentences || sentences.length === 0) {
        notFound();
    }

    return (
        <div className="flex flex-col items-center justify-center gap-y-10">
            <SpeakSession allSentences={sentences.map((s) => ({ sentence: s.jp_sentence, ipa: s.ipa_transcription, feature: s.feature }))} />
        </div>
    );
}

export default Menu