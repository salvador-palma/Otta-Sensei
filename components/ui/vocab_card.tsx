import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Vocab } from "@/db/schema"
import { ReferenceCard } from "./reference_card"
import { PartOfSpeech } from "./part_of_speech"
//[&_.kanji]:
const buttonVariants = cva(
  "text-center inline-flex items-center gap-2 justify-between whitespace-nowrap rounded-xl uppercase tracking-wide text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "flex-1 w-full flex flex-col gap-y-5 ",
      },
      size: {
        default: "p-5 [&_.kanji]:text-5xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function VocabCard({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  word,
  references,
  showing,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    word?: typeof Vocab.$inferSelect
    references?: typeof Vocab.$inferSelect[]
    showing: boolean
  }) {
  const Comp = asChild ? Slot : "div"

  if (word == null) { return (<div>Nothing Found</div>) }

  const questionSentence = word.sentenceJP ? GetTemplateSentence(word.sentenceJP, word.kanji) : ""

  return (
    <Comp
      data-slot="div"
      data-variant={variant}
      data-size={size}
      className={cn("px-4 b",
        buttonVariants({ variant, size, className }))}
      {...props}
    >
      <div className="exercise flex flex-col flex-1">

        <h1 className="meaning lg:text-2xl text-lg text-balance">
          {word.meaning}
        </h1>

        <PartOfSpeech className="pos normal-case text-xs mb-10 font-medium" pos={word.pos} />


        <span
          className="template lg:text-lg text-sm text-balance font-semibold lg:font-medium lg:hover:[&_rt]:visible lg:[&_rt]:invisible"
          dangerouslySetInnerHTML={{ __html: word.sentenceJP ? showing ? word.sentenceJP : questionSentence : "" }}
        />

        <span className="en_sentence normal-case lg:text-base text-sm text-balance font-medium">
          {word.sentenceEN}
        </span>

      </div>

      {showing &&
        <div className="solution flex flex-col h-[50%] flex-1 w-full">
          <span className="hiragana lg:text-base text-sm font-medium">
            {word.hiragana}
          </span>
          <span className="reading lg:text-2xl text-2xl font-semibold lg:font-medium">
            {word.kanji}
          </span>
        </div>
      }


      {showing && references && references.length > 0 && (
        <div className="flex flex-col gap-y-1">
          <span className="normal-case text-xs font-normal">
            Related words:
          </span>

          <div className="related flex flex-row w-full justify-center gap-x-2 [&_Button]:font-medium">
            {references.map((ref) => (
              <ReferenceCard key={ref.id} size="sm" reference={ref} />
            ))}
          </div>
        </div>
      )}

    </Comp>
  )
}

class Sentence {
  template: string
  en_sentence: string
  jp_sentence: string

  constructor(template: string, en_sentence: string, jp_sentence: string) {
    this.template = template
    this.en_sentence = en_sentence
    this.jp_sentence = jp_sentence
  }
}


function GetTemplateSentence(og_sentence : string, replaceable : string){
  const kanjis = replaceable.split(",")

  const pattern = new RegExp(`<rt>[^{</rt>}]*</rt>`, "g");
  let result = og_sentence.replace(pattern, "");

  kanjis.forEach(k => {
    const symbol = k.replace("～","").trim()
    result = result.replaceAll("<ruby>","").replaceAll("</ruby>","").replaceAll(symbol, "______")

  })

  return result

}

export { Sentence, Vocab, VocabCard, buttonVariants }
