import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="container mx-auto relative min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[350px] mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 grid grid-cols-2 gap-1">
              <div className="bg-black rounded-sm" />
              <div className="bg-pink-500 rounded-sm" />
              <div className="bg-pink-500 rounded-sm" />
              <div className="bg-black rounded-sm" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome to JAM</h1>
          <p className="text-muted-foreground">Just a minute - your learning journey awaits</p>
        </div>
        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/sign-in">Login</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/sign-up">Create an account</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

