import { Button } from "@/components/ui/button";
import { ClerkLoaded, ClerkLoading, SignedIn, UserButton, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image"
import Link from "next/link"

const userButtonAppearance = {
    elements: {
      userButtonAvatarBox: "w-10 h-10",
    },
  };

export const Header = () => {
  const curveStyle = {
    clipPath: "ellipse(85% 100% at 50% 0%)",
  };
  const curveStyleBg = {
    clipPath: "ellipse(120% 95% at 50% 3%)",
  };

  return (
    <div className="w-full h-[88px] bg-rose-500/50 flex items-start" style={curveStyleBg}>
      <header className=" h-20 w-full bg-rose-400 px-3" style={curveStyle}>
        <div className="lg:max-w-5xl mx-auto flex items-center justify-between h-full">
            <Link className="pt-8 lg:pl-4 pb-7 flex items-center lg:gap-x-3 gap-x-1" href="/">
             
              <Image src="/Icon.png" className="w-8 h-8 lg:w-10 lg:h-10" width={40} height={40} alt="Otta"/>
              <h1 className="text-white font-extrabold lg:text-2xl tracking-wide">
                オッタ先生
              </h1>
              
            </Link>
            <ClerkLoading>
              <Loader className="w-10 h-10 text-muted-foreground animate-spin"/>
            </ClerkLoading>
            <ClerkLoaded>
              <SignedIn>
                <UserButton appearance={userButtonAppearance}/>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="primaryghost">Log In</Button>
                </SignInButton>
              </SignedOut>
            </ClerkLoaded>
        </div>
      </header>
    </div>
  );
};


