import { Fragment } from "react";

// Matches <ruby>漢字<rt>かんじ</rt></ruby>
const RUBY = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g;

// Renders a sentence stored with <ruby> markup as real ruby elements.
// Only the ruby pattern becomes markup; everything else stays escaped text.
export const Furigana = ({ text, className }: { text: string, className?: string }) => {
    const parts: React.ReactNode[] = [];
    let last = 0;

    for (const match of text.matchAll(RUBY)) {
        const [whole, base, reading] = match;
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(<ruby key={match.index}>{base}<rt>{reading}</rt></ruby>);
        last = match.index + whole.length;
    }
    if (last < text.length) parts.push(text.slice(last));

    return <span className={className}>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</span>;
};
