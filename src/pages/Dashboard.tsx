import { useEffect, useState } from "react";
import { Shield, Activity, FileText, Users, ArrowRight, Plug, SlidersHorizontal, Server } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApiClient } from "@/lib/api";
import type { UseCaseKey } from "@/lib/llmApiConfigApi";

interface DashboardStats {
  instructionCount: number;
  activeInstructionCount: number;
  providerCount: number;
  activeProviderCount: number;
  assignedCount: number;
  systemOverall: string;
  orgCount: number;
  orgTrialCount: number;
  mcpServerCount: number;
  enabledMcpServerCount: number;
}

const USE_CASE_KEYS: UseCaseKey[] = ['chatbot', 'agent_plan', 'agent_execution', 'memory_distiller'];

async function loadStats(): Promise<DashboardStats> {
  const [instructionsRes, providersRes, assignmentsRes, healthRes, orgsRes, mcpRes] = await Promise.allSettled([
    adminApiClient.get("/v1/admin/instructions"),
    adminApiClient.get("/v1/admin/llm-providers"),
    adminApiClient.get("/v1/admin/llm-assignments"),
    adminApiClient.get("/v1/admin/system/health"),
    adminApiClient.get("/v1/admin/organizations"),
    adminApiClient.get("/v1/admin/mcp-servers"),
  ]);

  const instructions = instructionsRes.status === "fulfilled" ? instructionsRes.value.data.instructions : [];
  const providers = providersRes.status === "fulfilled" ? providersRes.value.data.providers : [];
  const assignments = assignmentsRes.status === "fulfilled" ? assignmentsRes.value.data.assignments : [];
  const health = healthRes.status === "fulfilled" ? healthRes.value.data : null;
  const orgs = orgsRes.status === "fulfilled" ? orgsRes.value.data.organizations : [];
  const mcpServers = mcpRes.status === "fulfilled" ? mcpRes.value.data.servers : [];

  return {
    instructionCount: instructions.length,
    activeInstructionCount: instructions.filter((i: Record<string, unknown>) => i.is_active).length,
    providerCount: providers.length,
    activeProviderCount: providers.filter((p: Record<string, unknown>) => p.is_active).length,
    assignedCount: assignments.filter(
      (a: Record<string, unknown>) => USE_CASE_KEYS.includes(a.use_case as UseCaseKey) && a.provider_id
    ).length,
    systemOverall: health?.overall ?? "unknown",
    orgCount: orgs.length,
    orgTrialCount: orgs.filter((o: Record<string, unknown>) => o.status === "trial").length,
    mcpServerCount: mcpServers.length,
    enabledMcpServerCount: mcpServers.filter((m: Record<string, unknown>) => m.enabled).length,
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats()
      .then(setStats)
      .catch((err) => console.error("Failed to load dashboard stats", err));
  }, []);

  const systemBadge =
    stats?.systemOverall === "healthy" ? "Healthy" :
    stats?.systemOverall === "degraded" ? "Degraded" :
    stats?.systemOverall === "down" ? "Down" : "Unknown";

  const systemBadgeVariant: "outline" | "secondary" | "destructive" =
    stats?.systemOverall === "healthy" ? "secondary" :
    stats?.systemOverall === "down" ? "destructive" : "outline";

  const systemValue = stats
    ? `${stats.systemOverall.charAt(0).toUpperCase() + stats.systemOverall.slice(1)}`
    : "Loading…";

  const summaryCards = [
    {
      title: "SSO Status",
      icon: Shield,
      value: "Not Configured",
      badge: "Setup Required",
      badgeVariant: "outline" as const,
      link: "/sso",
      description: "Configure OpenID Connect or SAML for your organization",
    },
    {
      title: "System Health",
      icon: Activity,
      value: systemValue,
      badge: systemBadge,
      badgeVariant: systemBadgeVariant,
      link: "/system",
      description: "Monitor chatbot, agent, and memory services",
    },
    {
      title: "LLM Instructions",
      icon: FileText,
      value: stats ? `${stats.activeInstructionCount} Active` : "Loading…",
      badge: stats ? `${stats.instructionCount} Total` : "…",
      badgeVariant: "secondary" as const,
      link: "/instructions",
      description: "Global instructions applied to all user sessions",
    },
    {
      title: "LLM API Providers",
      icon: Plug,
      value: stats ? `${stats.providerCount} Configured` : "Loading…",
      badge: stats ? `${stats.activeProviderCount} Active` : "…",
      badgeVariant: "secondary" as const,
      link: "/llm-providers",
      description: "Manage connections to LLM APIs (OpenAI, Anthropic, etc.)",
    },
    {
      title: "Tool LLM Assignment",
      icon: SlidersHorizontal,
      value: stats ? `${stats.assignedCount}/4 Assigned` : "Loading…",
      badge: stats ? `${4 - stats.assignedCount} Unassigned` : "…",
      badgeVariant: stats && stats.assignedCount < 4 ? ("outline" as const) : ("secondary" as const),
      link: "/llm-assignments",
      description: "Map LLM providers and models to each system function",
    },
    {
      title: "MCP Servers",
      icon: Server,
      value: stats ? `${stats.mcpServerCount} Configured` : "Loading…",
      badge: stats ? `${stats.enabledMcpServerCount} Enabled` : "…",
      badgeVariant: "secondary" as const,
      link: "/mcp-servers",
      description: "External Model Context Protocol servers exposing tools to the agent",
    },
    {
      title: "Organizations",
      icon: Users,
      value: stats ? `${stats.orgCount} Subscribed` : "Loading…",
      badge: stats ? `${stats.orgTrialCount} Trial` : "…",
      badgeVariant: "outline" as const,
      link: "/organizations",
      description: "Manage subscriber companies, billing, and ownership",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your platform configuration and system health.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="group hover:border-foreground/20 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <card.icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              </div>
              <Badge variant={card.badgeVariant}>{card.badge}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
              <Button variant="ghost" size="sm" asChild className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground">
                <Link to={card.link}>
                  Go to {card.title.toLowerCase()} <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/sso">Configure SSO</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/system">Check System Health</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/instructions">Add Instruction</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/llm-providers">Manage LLM Providers</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
