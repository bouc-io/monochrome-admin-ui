import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  BrainCircuit,
  Wrench,
  Database,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import {
  llmApiConfigApi,
  USE_CASE_LABELS,
  type LLMApiProvider,
  type UseCaseKey,
  type UseCaseAssignment,
} from "@/lib/llmApiConfigApi";
import { useOrgScope } from "@/context/OrgScopeContext";
import { useOrgScopedToast } from "@/lib/orgScopedToast";

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google AI" },
  { value: "azure", label: "Azure OpenAI" },
  { value: "custom", label: "Custom / Self-hosted" },
] as const;

const USE_CASE_ICONS: Record<UseCaseKey, React.ReactNode> = {
  chatbot: <Bot className="h-5 w-5 text-muted-foreground" />,
  agent_plan: <BrainCircuit className="h-5 w-5 text-muted-foreground" />,
  agent_execution: <Wrench className="h-5 w-5 text-muted-foreground" />,
  memory_distiller: <Database className="h-5 w-5 text-muted-foreground" />,
  memory_embedding: <Layers className="h-5 w-5 text-muted-foreground" />,
};

const providerLabel = (val: string) =>
  PROVIDER_OPTIONS.find((p) => p.value === val)?.label ?? val;

export default function LLMAssignments() {
  const { toast } = useToast();
  const { toastError } = useOrgScopedToast();
  const [providers, setProviders] = useState<LLMApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<
    Record<UseCaseKey, UseCaseAssignment | null>
  >({
    chatbot: null,
    agent_plan: null,
    agent_execution: null,
    memory_distiller: null,
    memory_embedding: null,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [data, ucAssignments] = await Promise.all([
        llmApiConfigApi.getProviders(),
        llmApiConfigApi.getUseCaseAssignments(),
      ]);
      setProviders(data);
      setAssignments(ucAssignments);
    } catch (err) {
      toastError("load LLM assignments", err);
    } finally {
      setLoading(false);
    }
  };

  const { activeOrgId, canSwitch } = useOrgScope();
  useEffect(() => {
    if (activeOrgId) fetchAll();
  }, [activeOrgId]);

  const activeProviders = providers.filter((p) => p.isActive);

  const handleAssignmentChange = async (
    useCase: UseCaseKey,
    field: "providerId" | "model",
    value: string,
  ) => {
    const current = assignments[useCase];
    let updated: UseCaseAssignment | null;

    if (field === "providerId") {
      if (value === "_none") {
        updated = null;
      } else {
        const prov = providers.find((p) => p.id === value);
        updated = {
          providerId: value,
          model: prov?.models[0] ?? "",
          enableReasoning: current?.enableReasoning ?? false,
          orgId: current?.orgId ?? null,
        };
      }
    } else if (field === "model") {
      if (!current) return;
      updated = { ...current, model: value };
    } else {
      return;
    }

    try {
      await llmApiConfigApi.setUseCaseAssignment(useCase, updated);
      setAssignments((prev) => ({ ...prev, [useCase]: updated }));
      toast({
        title: "Assignment Updated",
        description: `${USE_CASE_LABELS[useCase].label} configuration saved.`,
      });
    } catch (err) {
      toastError(
        `update the ${USE_CASE_LABELS[useCase].label} assignment`,
        err,
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tool LLM Assignment
        </h1>
        <p className="text-muted-foreground">
          Assign an LLM provider and model to each system function.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                Each tool or system function can use a different LLM provider
                and model. Only active providers appear here — manage providers
                in the <strong>LLM Providers</strong> page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading assignments...
        </div>
      ) : activeProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active LLM providers available. Add and activate providers in the
            LLM Providers page first.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Use Case Assignments</CardTitle>
            <CardDescription>
              Each use case can independently target a different provider,
              model, and reasoning mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(USE_CASE_LABELS) as UseCaseKey[]).map(
              (ucKey, idx) => {
                const { label, description } = USE_CASE_LABELS[ucKey];
                const assignment = assignments[ucKey];
                const selectedProvider = assignment
                  ? providers.find((p) => p.id === assignment.providerId)
                  : null;
                const availableModels = selectedProvider?.models ?? [];

                return (
                  <div key={ucKey}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-3 sm:w-[240px] shrink-0">
                        {USE_CASE_ICONS[ucKey]}
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-1 items-center gap-3">
                        <Select
                          value={assignment?.providerId ?? "_none"}
                          onValueChange={(v) =>
                            handleAssignmentChange(ucKey, "providerId", v)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">
                              — Not assigned —
                            </SelectItem>
                            {activeProviders.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={assignment?.model ?? ""}
                          onValueChange={(v) =>
                            handleAssignmentChange(ucKey, "model", v)
                          }
                          disabled={!assignment || availableModels.length === 0}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue
                              placeholder={assignment ? "Select model" : "—"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ucKey !== "memory_embedding" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Checkbox
                              id={`reasoning-${ucKey}`}
                              checked={assignment?.enableReasoning ?? false}
                              disabled={!assignment}
                              onCheckedChange={async (checked) => {
                                if (!assignment) return;
                                const updated = {
                                  ...assignment,
                                  enableReasoning: !!checked,
                                };
                                try {
                                  await llmApiConfigApi.setUseCaseAssignment(
                                    ucKey,
                                    updated,
                                  );
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [ucKey]: updated,
                                  }));
                                  toast({
                                    title: "Assignment Updated",
                                    description: `${USE_CASE_LABELS[ucKey].label} reasoning ${checked ? "enabled" : "disabled"}.`,
                                  });
                                } catch (err) {
                                  toastError(
                                    `update the ${USE_CASE_LABELS[ucKey].label} reasoning setting`,
                                    err,
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={`reasoning-${ucKey}`}
                              className="text-xs whitespace-nowrap"
                            >
                              Think
                            </Label>
                          </div>
                        )}
                        {assignment && selectedProvider && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {providerLabel(selectedProvider.provider)}
                          </Badge>
                        )}
                        {canSwitch && assignment && (
                          <Badge
                            variant={
                              assignment.orgId === null
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs shrink-0"
                          >
                            {assignment.orgId === null ? "Global" : "Org"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
