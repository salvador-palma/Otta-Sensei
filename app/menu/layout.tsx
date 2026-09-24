import {Header} from "../(marketing)/header"
import {Footer} from "../(marketing)/footer"
import { Button } from "@/components/ui/button";
import Image from "next/image"
import Link from "next/link";


type Props = {
    children: React.ReactNode
}

const MarketingLayout = ({children} : Props) => {
    return (
        <div className=" flex flex-col h-dvh">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center ">
                {children}
            </main>
            <Footer>
              <div className="text-red-50">
                
                Salvador Palma @ Interaction Lab - University of Tsukuba 2026
            
              </div>
            </Footer>
        </div>
    );
};

export default MarketingLayout;