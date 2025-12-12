// Vercel API Integration
// Handles all interactions with Vercel's REST API

import { logger } from "@/lib/utils/logger";

const VERCEL_API_BASE = "https://api.vercel.com";

// ============================================
// Types
// ============================================

export interface VercelUser {
  id: string;
  email: string;
  name: string | null;
  username: string;
  avatar?: string;
}

export interface VercelTeam {
  id: string;
  slug: string;
  name: string;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  link?: {
    type: string;
    repo: string;
  };
  framework: string | null;
  latestDeployments?: VercelDeployment[];
  createdAt: number;
  updatedAt: number;
}

export interface VercelDeployment {
  id: string;
  uid: string;
  name: string;
  url: string;
  state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  readyState: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  target: "production" | "preview" | null;
  meta?: Record<string, string>;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  alias?: string[];
  aliasAssigned?: number;
  aliasError?: { code: string; message: string };
}

export interface VercelDeploymentFile {
  file: string;
  data: string; // Base64 encoded content
  encoding?: "base64" | "utf-8";
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
  configuredBy?: string;
  createdAt: number;
}

export interface CreateProjectOptions {
  name: string;
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: ("production" | "preview" | "development")[];
  }>;
}

export interface CreateDeploymentOptions {
  projectId?: string;
  projectName?: string;
  files: VercelDeploymentFile[];
  target?: "production" | "preview";
  meta?: Record<string, string>;
}

// ============================================
// Vercel API Client
// ============================================

export class VercelClient {
  private accessToken: string;
  private teamId?: string;

  constructor(accessToken: string, teamId?: string) {
    this.accessToken = accessToken;
    this.teamId = teamId;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(`${VERCEL_API_BASE}${endpoint}`);

    // Add team ID to query params if set
    if (this.teamId) {
      url.searchParams.set("teamId", this.teamId);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message || response.statusText;
      logger.error("Vercel API error", {
        endpoint,
        status: response.status,
        error: errorMessage,
      });
      throw new VercelApiError(
        errorMessage,
        response.status,
        (errorData as { error?: { code?: string } })?.error?.code
      );
    }

    return response.json();
  }

  // ============================================
  // User & Team
  // ============================================

  /**
   * Get current authenticated user
   */
  async getUser(): Promise<VercelUser> {
    const response = await this.fetch<{ user: VercelUser }>("/v2/user");
    return response.user;
  }

  /**
   * List teams the user belongs to
   */
  async listTeams(): Promise<VercelTeam[]> {
    const response = await this.fetch<{ teams: VercelTeam[] }>("/v2/teams");
    return response.teams;
  }

  /**
   * Set team context for subsequent requests
   */
  setTeam(teamId: string | undefined): void {
    this.teamId = teamId;
  }

  // ============================================
  // Projects
  // ============================================

  /**
   * Create a new project
   */
  async createProject(options: CreateProjectOptions): Promise<VercelProject> {
    const body: Record<string, unknown> = {
      name: options.name,
      framework: options.framework || null,
    };

    if (options.buildCommand) {
      body.buildCommand = options.buildCommand;
    }

    if (options.outputDirectory) {
      body.outputDirectory = options.outputDirectory;
    }

    if (options.environmentVariables?.length) {
      body.environmentVariables = options.environmentVariables;
    }

    return this.fetch<VercelProject>("/v10/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get a project by ID or name
   */
  async getProject(projectIdOrName: string): Promise<VercelProject> {
    return this.fetch<VercelProject>(`/v9/projects/${encodeURIComponent(projectIdOrName)}`);
  }

  /**
   * List all projects
   */
  async listProjects(limit: number = 20): Promise<VercelProject[]> {
    const response = await this.fetch<{ projects: VercelProject[] }>(`/v9/projects?limit=${limit}`);
    return response.projects;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectIdOrName: string): Promise<void> {
    await this.fetch(`/v9/projects/${encodeURIComponent(projectIdOrName)}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // Deployments
  // ============================================

  /**
   * Create a new deployment with files
   * This is the main deployment function for our static HTML sites
   */
  async createDeployment(options: CreateDeploymentOptions): Promise<VercelDeployment> {
    const body: Record<string, unknown> = {
      name: options.projectName,
      files: options.files,
      target: options.target || "production",
      projectSettings: {
        framework: null, // Static HTML
      },
    };

    if (options.projectId) {
      body.project = options.projectId;
    }

    if (options.meta) {
      body.meta = options.meta;
    }

    logger.info("Creating Vercel deployment", {
      projectName: options.projectName,
      fileCount: options.files.length,
      target: options.target,
    });

    return this.fetch<VercelDeployment>("/v13/deployments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.fetch<VercelDeployment>(`/v13/deployments/${deploymentId}`);
  }

  /**
   * List deployments for a project
   */
  async listDeployments(
    projectId: string,
    options: { limit?: number; target?: "production" | "preview" } = {}
  ): Promise<VercelDeployment[]> {
    const params = new URLSearchParams();
    params.set("projectId", projectId);
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.target) params.set("target", options.target);

    const response = await this.fetch<{ deployments: VercelDeployment[] }>(
      `/v6/deployments?${params.toString()}`
    );
    return response.deployments;
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.fetch<VercelDeployment>(`/v12/deployments/${deploymentId}/cancel`, {
      method: "PATCH",
    });
  }

  /**
   * Poll deployment status until it's ready or errored
   */
  async waitForDeployment(
    deploymentId: string,
    options: {
      timeout?: number;
      pollInterval?: number;
      onStatusChange?: (status: VercelDeployment["state"]) => void;
    } = {}
  ): Promise<VercelDeployment> {
    const { timeout = 300000, pollInterval = 3000, onStatusChange } = options;
    const startTime = Date.now();
    let lastState: VercelDeployment["state"] | null = null;

    while (Date.now() - startTime < timeout) {
      const deployment = await this.getDeployment(deploymentId);

      if (deployment.state !== lastState) {
        lastState = deployment.state;
        onStatusChange?.(deployment.state);
        logger.debug("Deployment status changed", { deploymentId, state: deployment.state });
      }

      if (
        deployment.state === "READY" ||
        deployment.state === "ERROR" ||
        deployment.state === "CANCELED"
      ) {
        return deployment;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new VercelApiError("Deployment timeout", 408, "DEPLOYMENT_TIMEOUT");
  }

  // ============================================
  // Domains
  // ============================================

  /**
   * Add a domain to a project
   */
  async addDomain(projectIdOrName: string, domain: string): Promise<VercelDomain> {
    return this.fetch<VercelDomain>(
      `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`,
      {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      }
    );
  }

  /**
   * Get domain configuration
   */
  async getDomain(projectIdOrName: string, domain: string): Promise<VercelDomain> {
    return this.fetch<VercelDomain>(
      `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}`
    );
  }

  /**
   * List domains for a project
   */
  async listDomains(projectIdOrName: string): Promise<VercelDomain[]> {
    const response = await this.fetch<{ domains: VercelDomain[] }>(
      `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains`
    );
    return response.domains;
  }

  /**
   * Remove a domain from a project
   */
  async removeDomain(projectIdOrName: string, domain: string): Promise<void> {
    await this.fetch(
      `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}`,
      { method: "DELETE" }
    );
  }

  /**
   * Verify domain DNS configuration
   */
  async verifyDomain(projectIdOrName: string, domain: string): Promise<VercelDomain> {
    return this.fetch<VercelDomain>(
      `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domain)}/verify`,
      { method: "POST" }
    );
  }
}

// ============================================
// Error Class
// ============================================

export class VercelApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
    this.code = code;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert HTML/CSS/JS content to Vercel deployment files
 */
export function prepareDeploymentFiles(
  htmlContent: string,
  cssContent?: string,
  jsContent?: string
): VercelDeploymentFile[] {
  const files: VercelDeploymentFile[] = [];

  // Create a self-contained HTML file with inline styles and scripts
  let fullHtml = htmlContent;

  // If CSS is provided separately, inject it into the head
  if (cssContent) {
    const styleTag = `<style>${cssContent}</style>`;
    if (fullHtml.includes("</head>")) {
      fullHtml = fullHtml.replace("</head>", `${styleTag}</head>`);
    } else {
      fullHtml = `<style>${cssContent}</style>${fullHtml}`;
    }
  }

  // If JS is provided separately, inject it before closing body
  if (jsContent) {
    const scriptTag = `<script>${jsContent}</script>`;
    if (fullHtml.includes("</body>")) {
      fullHtml = fullHtml.replace("</body>", `${scriptTag}</body>`);
    } else {
      fullHtml = `${fullHtml}<script>${jsContent}</script>`;
    }
  }

  // Main HTML file
  files.push({
    file: "index.html",
    data: Buffer.from(fullHtml).toString("base64"),
    encoding: "base64",
  });

  return files;
}

/**
 * Generate a URL-safe project name from a site title
 */
export function generateProjectName(siteTitle: string, siteId: string): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  const baseName = siteTitle
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  // Append short site ID for uniqueness
  const shortId = siteId.substring(0, 8);

  return `${baseName}-${shortId}`;
}

/**
 * Map Vercel deployment state to our status
 */
export function mapVercelStateToStatus(
  state: VercelDeployment["state"]
): "pending" | "building" | "ready" | "error" | "canceled" {
  switch (state) {
    case "QUEUED":
    case "INITIALIZING":
      return "pending";
    case "BUILDING":
      return "building";
    case "READY":
      return "ready";
    case "ERROR":
      return "error";
    case "CANCELED":
      return "canceled";
    default:
      return "pending";
  }
}
