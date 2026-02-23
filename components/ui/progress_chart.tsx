import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "lg:flex-row flex-col hidden lg:flex rounded-full overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-[#F53366]",
      },
      size: {
        default: "lg:w-full lg:h-1 h-full w-1",        
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function ProgressChart({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  card_nums,
  
  onClick,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    card_nums: [number, string][]
    onClick?: () => void
  }) {
  const Comp = asChild ? Slot : "div"

  const total = card_nums.reduce((acc, [num, _]) => {
    if (isNaN(num)) {
      return acc;
    }
    return acc + num;
  }, 0);
  const percentages = card_nums.map(([num, color]) => [total > 0 ? (num / total) * 100 : 0, color] as [number, string]);

  return (
    <Comp
      data-slot="div"
      data-variant={variant}
      data-size={size}
      className={
        buttonVariants({ variant, size, className })}
      {...props}
      onClick={onClick
      }
    >  
      {/* <div className="bg-green-900 h-full w-1/2"></div>
      <div className="bg-green-500 h-full w-1/2"></div> */}
      {percentages.map(([percentage, color], index) => (
        
        <div key={index} style={{ width: `${percentage}%`, backgroundColor: color }}  className="h-full "></div>
      ))}
    </Comp>
  )
}

export { ProgressChart, buttonVariants }
