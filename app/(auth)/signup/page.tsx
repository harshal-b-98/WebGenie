import { SignupForm } from "@/components/features/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">NextGenWeb</h1>
          <p className="mt-2 text-gray-600">AI-Powered Website Builder</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
