import { Button } from "@/components/ui/button";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, SignUpButton, SignInButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from 'next/image'
import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-[998px] mx-auto flex-1 w-full flex flex-col lg:flex-row items-center justify-center p-4 gap-2">
      <div className="relative w-[450px] h-[450px] mb-8 lg:mb-0">
        <Image src="/Otta.png" fill alt="Picture of the author"/>
      </div>
      <div className="flex flex-col items-center gap-y-8">
        <h1 className="text-2xl text-slate-900 font-semibold">Welcome to Otta Sensei's class</h1>
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
                <Link href="\learn">
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
