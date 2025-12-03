import { requireUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome, {user.email}</p>
        <div className="mt-8">
          <p className="text-gray-500">Your projects will appear here...</p>
        </div>
      </div>
    </div>
  );
}
