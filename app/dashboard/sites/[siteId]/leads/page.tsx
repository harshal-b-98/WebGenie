"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  Mail,
  Building,
  Phone,
  Calendar,
  Filter,
  Search,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  job_title: string | null;
  message: string | null;
  source_page: string | null;
  source_segment: string | null;
  form_type: string | null;
  detected_persona: string | null;
  status: string;
  created_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

export default function LeadsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formTypeFilter, setFormTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
  });

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get site name
      const { data: site } = await supabase.from("sites").select("title").eq("id", siteId).single();

      if (site) {
        setSiteName((site as { title: string }).title);
      }

      // Get leads
      const { data, error: fetchError } = await supabase
        .from("site_leads")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const leadsData = (data || []) as Lead[];
      setLeads(leadsData);
      setFilteredLeads(leadsData);

      // Calculate stats
      setStats({
        total: leadsData.length,
        new: leadsData.filter((l) => l.status === "new").length,
        contacted: leadsData.filter((l) => l.status === "contacted").length,
        qualified: leadsData.filter((l) => l.status === "qualified").length,
      });
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setError("Failed to load leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [siteId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...leads];

    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    if (formTypeFilter !== "all") {
      filtered = filtered.filter((l) => l.form_type === formTypeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.email.toLowerCase().includes(query) ||
          (l.name && l.name.toLowerCase().includes(query)) ||
          (l.company && l.company.toLowerCase().includes(query))
      );
    }

    setFilteredLeads(filtered);
  }, [leads, statusFilter, formTypeFilter, searchQuery]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("site_leads") as any)
      .update({ status: newStatus })
      .eq("id", leadId);

    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    }
  };

  const exportLeads = () => {
    const csv = [
      [
        "Email",
        "Name",
        "Company",
        "Phone",
        "Job Title",
        "Form Type",
        "Source Page",
        "Status",
        "Date",
      ].join(","),
      ...filteredLeads.map((l) =>
        [
          l.email,
          l.name || "",
          l.company || "",
          l.phone || "",
          l.job_title || "",
          l.form_type || "",
          l.source_page || "",
          l.status,
          new Date(l.created_at).toLocaleDateString(),
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${siteName || siteId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "default",
      contacted: "secondary",
      qualified: "default",
      converted: "default",
      archived: "outline",
    };

    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-green-100 text-green-800",
      converted: "bg-purple-100 text-purple-800",
      archived: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getFormTypeBadge = (formType: string | null) => {
    if (!formType) return null;

    const colors: Record<string, string> = {
      demo: "bg-indigo-100 text-indigo-800",
      contact: "bg-cyan-100 text-cyan-800",
      newsletter: "bg-pink-100 text-pink-800",
      pricing: "bg-orange-100 text-orange-800",
      custom: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge variant="outline" className={colors[formType] || ""}>
        {formType}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Site
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-gray-500">{siteName || "Loading..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportLeads}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.new}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contacted</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.contacted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.qualified}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email, name, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Form Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || formTypeFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setFormTypeFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads yet</p>
              <p className="text-sm">
                Leads will appear here when visitors submit forms on your website.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{lead.name || "Unknown"}</p>
                          <p className="text-sm text-gray-500">{lead.email}</p>
                          {lead.phone && (
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.company ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>{lead.company}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      {lead.job_title && <p className="text-sm text-gray-500">{lead.job_title}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{lead.source_page || "-"}</p>
                      {lead.utm_source && (
                        <p className="text-xs text-gray-400">via {lead.utm_source}</p>
                      )}
                    </TableCell>
                    <TableCell>{getFormTypeBadge(lead.form_type)}</TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value: string) => updateLeadStatus(lead.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Showing count */}
      {!loading && filteredLeads.length > 0 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      )}
    </div>
  );
}
