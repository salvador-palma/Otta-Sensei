import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { randomInt } from "crypto"
import { Button } from "./button"
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
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    word: Vocab
  }) {
  const Comp = asChild ? Slot : "div"
  
  const activeSentence = word.sentences[randomInt(word.sentences.length)]


  const parts = activeSentence.template.split("______");
  const solutionSentence = (
    <>
      {parts[0]}
      <span className="text-rose-500">{word.reading}</span>
      {parts[1]}
    </>
  );

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

        <span className="pos normal-case text-xs mb-10 font-medium">
          {word.part_of_speech}
        </span>
      
        <span 
          className="template lg:text-lg text-sm text-balance font-semibold lg:font-medium lg:hover:[&_rt]:visible lg:[&_rt]:invisible"
          dangerouslySetInnerHTML={{ __html: activeSentence.template }} 
        />

        <span className="en_sentence normal-case lg:text-base text-sm text-balance font-medium">
          {activeSentence.en_sentence}
        </span>

      </div>
      
      <div className="solution flex flex-col h-[50%] flex-1 w-full">
        <span className="reading lg:text-2xl text-2xl font-semibold lg:font-medium">
        {word.reading}
        </span>
        <span className="hiragana mb-10 lg:text-base text-sm font-medium">
          {word.hiragana}
        </span>
      </div>
      
      <div className="flex flex-col gap-y-1">
        <span className="normal-case text-xs font-normal">Related words:</span>
        <div className="related flex flex-row w-full justify-center gap-x-2 [&_Button]:font-medium">
          <Button size={"sm"}>共産主義者</Button>
          <Button size={"sm"}>共産主義政権</Button>
          <Button size={"sm"}>共産主義者</Button>
        </div>
      </div>
    </Comp>
  )
}

class Sentence{
    template: string
    en_sentence: string
    jp_sentence: string

    constructor(template: string, en_sentence: string, jp_sentence: string) {
        this.template = template
        this.en_sentence = en_sentence
        this.jp_sentence = jp_sentence
    }
}

class Vocab {
  reading: string
  hiragana: string
  jlpt: number
  meaning: string
  part_of_speech: string

  sentences: Sentence[]

  related: Vocab[]

  constructor(reading: string, hiragana: string, jlpt: number, meaning: string, part_of_speech: string, sentences: Sentence[], related: Vocab[]) {
    this.reading = reading
    this.hiragana = hiragana
    this.jlpt = jlpt
    this.meaning = meaning
    this.part_of_speech = part_of_speech
    this.sentences = sentences
    this.related = related
  }
}

export { Sentence, Vocab, VocabCard, buttonVariants }
