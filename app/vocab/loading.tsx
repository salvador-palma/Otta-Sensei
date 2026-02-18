import { Loader } from "lucide-react";

const Loading = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <Loader className="animate-spin" size={48} />
            <span className="text-sm text-slate-500">Loading...</span>
        </div>
    )
}

export default Loading;