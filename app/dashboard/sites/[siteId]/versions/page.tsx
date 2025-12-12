import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GitCompare } from "lucide-react";

interface SiteVersion {
  id: string;
  version_number: number;
  html_content: string;
  generation_type: string;
  ai_provider: string;
  model: string;
  generation_time_ms: number;
  created_at: string;
  change_summary: string | null;
}

interface Site {
  id: string;
  title: string;
  current_version_id: string | null;
}

export default async function VersionsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const user = await requireUser();
  const { siteId } = await params;

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Get site details
  const { data: site } = await supabase
    .from("sites")
    .select("id, title, current_version_id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) {
    redirect("/dashboard");
  }

  // Get all versions for this site
  const { data: versions } = await supabase
    .from("site_versions")
    .select("*")
    .eq("site_id", siteId)
    .order("version_number", { ascending: false });

  const typedSite = site as unknown as Site;
  const typedVersions = (versions || []) as unknown as SiteVersion[];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/dashboard/sites/${siteId}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Site
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{typedSite.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all generated versions of your website
            </p>
          </div>
          {typedVersions.length >= 2 && (
            <Button asChild>
              <Link href={`/dashboard/sites/${siteId}/versions/compare`}>
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Versions
              </Link>
            </Button>
          )}
        </div>

        {/* No versions message */}
        {typedVersions.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Versions Yet</CardTitle>
              <CardDescription>
                You haven&apos;t generated any website versions yet. Start by chatting with AI and
                generating your first version.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/dashboard/sites/${siteId}/generate`}>Generate Website</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Versions List */}
        {typedVersions.length > 0 && (
          <div className="space-y-4">
            {typedVersions.map((version) => {
              const isCurrentVersion = version.id === typedSite.current_version_id;
              const createdDate = new Date(version.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Card
                  key={version.id}
                  className={isCurrentVersion ? "border-green-500 border-2" : ""}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>Version {version.version_number}</CardTitle>
                          {isCurrentVersion && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Current
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {version.generation_type}
                          </span>
                        </div>
                        <CardDescription className="mt-2">
                          Generated {createdDate} • {version.model} •{" "}
                          {(version.generation_time_ms / 1000).toFixed(1)}s
                        </CardDescription>
                        {version.change_summary && (
                          <p className="mt-2 text-sm text-gray-600">{version.change_summary}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/sites/${siteId}/preview?version=${version.id}`}>
                          Preview
                        </Link>
                      </Button>
                      {typedVersions.length >= 2 && (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/dashboard/sites/${siteId}/versions/compare?right=${version.id}`}
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            Compare
                          </Link>
                        </Button>
                      )}
                      {!isCurrentVersion && (
                        <form
                          action={`/api/sites/${siteId}/versions/${version.id}/set-current`}
                          method="POST"
                        >
                          <Button type="submit" variant="default" size="sm">
                            Set as Current
                          </Button>
                        </form>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={`data:text/html;charset=utf-8,${encodeURIComponent(version.html_content)}`}
                          download={`website-v${version.version_number}.html`}
                        >
                          Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
