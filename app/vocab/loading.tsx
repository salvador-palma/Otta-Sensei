import { Loader } from "lucide-react";
import Image from 'next/image';


const Loading = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <Image className="transform -translate-x-0.5" src="/daruma.gif" alt="Loading..." width={90} height={75} unoptimized/>
            <span className="text-sm text-slate-500">Loading Vocab...</span>
        </div>
    )
}

export default Loading;