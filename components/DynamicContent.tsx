"use client";

import { ContentSection } from "@/types";

interface DynamicContentProps {
  sections: ContentSection[];
}

export default function DynamicContent({ sections }: DynamicContentProps) {
  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome</h2>
          <p>Start chatting to generate content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 space-y-12 scroll-smooth">
      {sections.map((section) => (
        <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {section.type === "features" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">{section.data.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {section.data.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <h3 className="font-semibold text-lg mb-2 text-blue-900">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "pricing" && (
            <div className="bg-slate-900 p-8 rounded-2xl text-white">
              <h2 className="text-3xl font-bold mb-8 text-center">Pricing Plans</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {section.data.plans.map((plan: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-blue-400 mb-4">{plan.price}</div>
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, fIdx: number) => (
                        <li key={fIdx} className="flex items-center text-gray-300">
                          <span className="mr-2 text-blue-400">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-medium">
                      Choose {plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "form" && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Get Started</h2>
              <form className="max-w-md mx-auto space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {section.data.fields.map((field: any, idx: number) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter your ${field.name}`}
                    />
                  </div>
                ))}
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                  Submit
                </button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
