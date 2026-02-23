import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function addDays(days: number) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date
}

export function today(){
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
}

export function intervaltoDate(interval: number, progress: any) {

    //const newInterval = progress.repetition == 1 ? 6 : Math.ceil(progress.interval * progress.easiness_factor);

    if (interval === 0) return "Tomorrow";
    if (interval === 1) return "In 6 days";
    
    const newInterval = Math.ceil(interval * progress)
    if (newInterval < 30) {
        return `In ${newInterval} days`;
    } 
    
    if (newInterval < 365) {
        const months = (newInterval / 30).toFixed(1);
        return `In ${months} months`;
    } 
    
    const years = (newInterval / 365).toFixed(1);
    return `In ${years} years`;
}
