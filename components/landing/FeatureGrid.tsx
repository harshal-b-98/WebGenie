const features = [
  {
    name: "AI-Powered Conversations",
    description:
      "Simply describe your website in natural language. Our AI asks smart questions to understand your needs.",
    icon: "💬",
  },
  {
    name: "Beautiful Designs",
    description:
      "Get professionally designed websites that work perfectly on all devices—no design skills needed.",
    icon: "🎨",
  },
  {
    name: "Instant Publishing",
    description:
      "Your website goes live in minutes with a clean URL. Share it immediately or customize further.",
    icon: "🚀",
  },
  {
    name: "Easy Refinement",
    description:
      "Chat with AI to refine your website. Request changes and see them applied in real-time.",
    icon: "✨",
  },
  {
    name: "Multiple Projects",
    description:
      "Create and manage unlimited websites from one dashboard. Perfect for agencies and freelancers.",
    icon: "📁",
  },
  {
    name: "Document Upload",
    description:
      "Upload your pitch deck or business docs. AI extracts key information to build better websites.",
    icon: "📄",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to build amazing websites
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Powered by cutting-edge AI, designed for simplicity
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-2xl">
                    {feature.icon}
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
