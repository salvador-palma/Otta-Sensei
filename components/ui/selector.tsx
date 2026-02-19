import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl uppercase tracking-wide text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-rose-400 text-rose-800 hover:text-white hover:bg-rose-500/85 [&_.kanji]:text-5xl hover:border-0 border-rose-500 border-b-4 active:border-b-2",
        ghost: "bg-slate-300 text-slate-500 "
      },
      size: {
        default: "p-5 [&_.kanji]:text-5xl",
        defaultsquare: "py-5 px-8.5 pb-6 [&_.kanji]:text-5xl",
        lgsquare: "text-xl [&_.kanji]:text-3xl py-2 px-7 lg:h-30 lg:w-30 lg:text-sm lg:[&_.kanji]:text-5xl",
        
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Selector({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  kanji,
  subtitle,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    kanji: string
    subtitle: string
    onClick?: () => void
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn("selector-root flex flex-row-reverse lg:flex-col items-center justify-center gap-1",
        buttonVariants({ variant, size, className }))}
      {...props}
      onClick={onClick
      }
    >
      <span className="title">
        {subtitle}
      </span>
      <span className="kanji">
        {kanji}
      </span>
      
    </Comp>
  )
}

export { Selector, buttonVariants }
