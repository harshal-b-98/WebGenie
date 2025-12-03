import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Build Your Website by{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Conversation
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            NextGenWeb uses AI to transform your ideas into beautiful, professional websites. Just
            describe what you need—no coding, no design skills required.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/signup">Start Building - Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-x-6 text-sm text-gray-500">
            <span>✓ No credit card required</span>
            <span>✓ Build in minutes</span>
            <span>✓ Publish instantly</span>
          </div>
        </div>

        {/* Hero Image/Demo Placeholder */}
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative -m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div className="aspect-[16/9] rounded-md bg-gradient-to-br from-blue-100 to-purple-100 shadow-2xl ring-1 ring-gray-900/10">
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg
                    className="mx-auto h-24 w-24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-4 text-sm">Live Preview Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
