"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Vocab } from "@/db/schema"
import { PartOfSpeech } from "./part_of_speech"

const referenceVariants = cva(
  "text-center inline-flex items-center gap-2 justify-between whitespace-nowrap rounded-xl uppercase tracking-wide text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "flex-1 w-full flex flex-col gap-y-5 ",
      },
      size: {
        default: "p-5 [&_.kanji]:text-5xl",
        sm: "size-sm"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type VocabType = typeof Vocab.$inferSelect;

function ReferenceCard({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  reference,
  ...props

}: React.ComponentProps<"div"> &
  VariantProps<typeof referenceVariants> & {
    asChild?: boolean
    reference?: VocabType,

  }) {
  const Comp = asChild ? Slot : "div"

  if (reference == null) { return (<div>Nothing Found</div>) }


  return (
    <Comp
      data-slot="div"
      data-variant={variant}
      data-size={size}
      // 1. Added 'group' and 'relative' to the parent
      className={cn("group relative inline-block", referenceVariants({ variant, size, className }))}
      {...props}
    >
      <Button key={reference.id} size="sm" onClick={() => {
        const query = encodeURIComponent(`${reference.kanji} english meaning`);
        window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
      }}>
        {reference.kanji}
      </Button>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col p-2 bg-popover border rounded-md shadow-md z-10 min-w-[120px]">
        <span className="text-xs font-bold">{reference.hiragana}</span>
        <span className="text-xs text-muted-foreground">{reference.meaning}</span>
        <PartOfSpeech className="text-xs text-muted-foreground" pos={reference.pos} />
      </div>
    </Comp>
  )
}


export { ReferenceCard, referenceVariants }
