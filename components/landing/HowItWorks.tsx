const steps = [
  {
    number: "01",
    title: "Describe Your Website",
    description:
      "Chat with our AI and answer a few simple questions about your business, goals, and target audience. Upload documents for even better results.",
  },
  {
    number: "02",
    title: "AI Generates Your Site",
    description:
      "Watch as our AI creates a beautiful, responsive website tailored to your needs. Preview it on desktop, tablet, and mobile.",
  },
  {
    number: "03",
    title: "Refine & Publish",
    description:
      "Make changes through conversation—no coding needed. When you're happy, publish with one click and share your live URL.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            From idea to published website in three simple steps
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex gap-x-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {step.number}
                  </div>
                  {index !== steps.length - 1 && <div className="mt-4 h-full w-0.5 bg-gray-200" />}
                </div>
                <div className="flex-1 pb-12">
                  <h3 className="text-2xl font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 text-center">
          <a
            href="/signup"
            className="inline-flex items-center rounded-md bg-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </section>
  );
}
