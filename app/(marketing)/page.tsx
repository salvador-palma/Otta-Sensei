import { Button } from "@/components/ui/button";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, SignUpButton, SignInButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from 'next/image'
import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-[998px] mx-auto flex-1 w-full flex flex-col lg:flex-row items-center p-4 lg:gap-2 gap-0">
      <div className="relative lg:w-[450px] lg:h-[450px] w-[250px] h-[250px] lg:mb-8 mb-3 ">
        <Image src="/Otta.png" fill alt="Picture of the author"/>
      </div>
      <div className="flex flex-col items-center lg:gap-y-8 gap-y-2 ">
        <h1 className="lg:text-2xl text-lg text-slate-900 font-semibold">Welcome to Otta Sensei's class</h1>
        <div className="w-full">
          <ClerkLoading>
            <Loader className="w-10 h-10 text-muted-foreground animate-spin"/>
          </ClerkLoading>
          <ClerkLoaded>
            <SignedOut>
              <SignUpButton mode="modal">
                <Button className="w-full" variant={"primary"}>Start Learning</Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button className="w-full" variant={"outline"}>I already have an account</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button variant="primary" className="w-full">
                <Link href="\menu">
                  Continue learning
                </Link>
              </Button>
            </SignedIn>
          </ClerkLoaded>
        </div>
      </div>
       
    </div>
    
  );
}
