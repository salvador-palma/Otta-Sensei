"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { randomInt } from "crypto"
import { Button } from "./button"
import { Vocab } from "@/db/schema"
import { getReferences } from "@/db/queries"


const POS: Record<string, [string, string]> = {
    "n": ["Noun", "#fbbf24"],
    "adj-i": ["い-Adjective", "#f472b6"],
    "adj-na": ["な-Adjective", "#f472b6"],
    "int": ["Interjection", "#a3a3a3"],
    "v1": ["Ichidan Verb", "#60a5fa"],
    "v5m": ["Godan Verb", "#60a5fa"],
    "v5g": ["Godan Verb", "#60a5fa"],
    "v5k": ["Godan Verb", "#60a5fa"],
    "v5k-s": ["Godan Verb", "#60a5fa"],
    "v5t": ["Godan Verb", "#60a5fa"],
    "v5b": ["Godan Verb", "#60a5fa"],
    "v5u": ["Godan Verb", "#60a5fa"],
    "v5r": ["Godan Verb", "#60a5fa"],
    "v5s": ["Godan Verb", "#60a5fa"],
    "vs-i": ["Suru Verb", "#f472b6"],
    "conj": ["Conjuction", "#c7c7c7"],
    "vt": ["Transitive Verb", "#3b82f6"],
    "vi": ["Intransitive Verb", "#3b82f6"],
    "adv": ["Adverb", "#a3a3a3"],
    "exp": ["Expression", "#c7c7c7"],
    "vs": ["Suru Verb", "#f472b6"],
    "num": ["Number", "#a3a3a3"],
    "pn": ["Pronoun", "#c7c7c7"],
    "suf": ["Suffix", "#c7c7c7"],
    "aux-v": ["Auxiliary Verb", "#94a3b8"],
    "adj-no": ["Adjective Noun", "#f472b6"],
    "adj-pn": ["Pre-noun Adjective", "#f472b6"],
    "v5r-i": ["Godan Verb", "#60a5fa"],
    "ctr": ["Counter", "#a3a3a3"],
    "n-suf": ["Noun Suffix", "#fbbf24"],
    "n-pref": ["Noun Prefix", "#fbbf24"],
    "pref": ["Prefix", "#c7c7c7"],
    "adv-to": ["と-Adverb", "#a3a3a3"],
    "adj-f": ["Verb acting Prenominally", "#f472b6"],
    "vk": ["Kuru Verb", "#60a5fa"],
    "v5n": ["Godan Verb", "#60a5fa"],
    "vn": ["Godan Verb", "#60a5fa"],
    "prt": ["Particle", "#c7c7c7"],
    "aux-adj": ["Auxiliary Adjective", "#f472b6"],
    "adj-ix": ["い-Adjective", "#f472b6"]
}


const posVariants = cva(
    "",
    {
        variants: {
            variant: {
                default: "",
            },
            size: {
                default: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

function PartOfSpeech({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    pos,
    ...props

}: React.ComponentProps<"div"> &
    VariantProps<typeof posVariants> & {
        asChild?: boolean
        pos: string | null,

    }) {
    const Comp = asChild ? Slot : "div"

    const parts: [string, string][] = pos ? pos.split(",").map(p => p.trim()).map(p => POS[p]).filter(Boolean) as [string, string][] : [];

    return (
        <Comp
            data-slot="div"
            data-variant={variant}
            data-size={size}
            className={cn("group relative flex flex-row gap-1 justify-center", posVariants({ variant, size, className }))}
            {...props}
        >
            {parts.length > 0 &&
                parts.map((p, index) => (
                    <Button key={index} size="xxs" variant="default" clickable={false}>
                        {p[0]}
                    </Button>
                ))
            }
        </Comp>
    );
}

export { PartOfSpeech, posVariants }