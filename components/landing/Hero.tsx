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

        {/* Hero Demo */}
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative -m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div className="aspect-[16/9] rounded-md bg-white shadow-2xl ring-1 ring-gray-900/10 p-8">
              <div className="flex h-full flex-col">
                {/* Chat Preview */}
                <div className="flex-1 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      AI
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-100 p-3">
                      <p className="text-sm text-gray-700">
                        What type of website would you like to build?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 max-w-md rounded-lg bg-blue-600 p-3 text-right">
                      <p className="text-sm text-white">A landing page for my SaaS product</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      AI
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-100 p-3">
                      <p className="text-sm text-gray-700">
                        Perfect! Tell me about your target audience...
                      </p>
                    </div>
                  </div>
                </div>
                {/* Input Preview */}
                <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
                  <div className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2">
                    <p className="text-sm text-gray-400">Type your message...</p>
                  </div>
                  <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
