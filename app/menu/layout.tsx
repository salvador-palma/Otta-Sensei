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
              <div>
                <Button variant="imageprimary"><Image src="/User.svg" width={50} height={50} alt="User"/></Button>
                <Button variant="imageprimary"><Image src="/Stats.svg" width={50} height={50} alt="Stats"/></Button>
                <Button variant="imageprimary"><Image src="/Crown.svg" width={50} height={50} alt="Crown"/></Button>
                <Button variant="imageprimary"><Image src="/Settings.svg" width={50} height={50} alt="Settings"/></Button>
              </div>
            </Footer>
        </div>
    );
};

export default MarketingLayout;