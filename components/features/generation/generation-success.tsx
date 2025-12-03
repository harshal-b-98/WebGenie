"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GenerationSuccessProps {
  siteId: string;
  generationTime: number;
}

export function GenerationSuccess({ siteId, generationTime }: GenerationSuccessProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Success Icon with Confetti Effect */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500"
        >
          <svg
            className="h-12 w-12 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        {/* Success Message */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Website is Ready!</h2>
          <p className="mt-2 text-lg text-gray-600">
            Generated in {(generationTime / 1000).toFixed(1)} seconds
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href={`/dashboard/sites/${siteId}/preview`}>
              View Your Website
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
