import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TestTube, Pencil, Key, Plug, ExternalLink, Lock, Eye, EyeOff } from "lucide-react";
import { llmApiConfigApi, type LLMApiProvider, type LLMApiProviderInput } from "@/lib/llmApiConfigApi";
import { useOrgScope } from "@/context/OrgScopeContext";
import { useOrgScopedToast } from "@/lib/orgScopedToast";

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", defaultEndpoint: "https://api.openai.com/v1", defaultModels: "gpt-4o, gpt-4o-mini, gpt-3.5-turbo" },
  { value: "anthropic", label: "Anthropic", defaultEndpoint: "https://api.anthropic.com/v1", defaultModels: "claude-sonnet-4-20250514, claude-3-5-haiku-20241022" },
  { value: "google", label: "Google AI", defaultEndpoint: "https://generativelanguage.googleapis.com/v1", defaultModels: "gemini-2.5-pro, gemini-2.5-flash" },
  { value: "azure", label: "Azure OpenAI", defaultEndpoint: "https://<resource>.openai.azure.com", defaultModels: "gpt-4o, gpt-4o-mini" },
  { value: "custom", label: "Custom / Self-hosted", defaultEndpoint: "", defaultModels: "" },
  { value: "boucio", label: "Bouc.io (internal Ollama)", defaultEndpoint: "", defaultModels: "qwen3.5:2b" },
] as const;

const providerLabel = (val: string) => PROVIDER_OPTIONS.find(p => p.value === val)?.label ?? val;

export default function LLMProviders() {
  const { toast } = useToast();
  const { toastError } = useOrgScopedToast();
  const [providers, setProviders] = useState<LLMApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState<LLMApiProvider["provider"]>("openai");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [formModels, setFormModels] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await llmApiConfigApi.getProviders();
      setProviders(data);
    } catch (err) {
      toastError("load LLM providers", err);
    } finally {
      setLoading(false);
    }
  };

  const { activeOrgId, activeOrg, isPinned, canSwitch } = useOrgScope();
  useEffect(() => { if (activeOrgId) fetchProviders(); }, [activeOrgId]);

  const resetForm = () => {
    setFormName("");
    setFormProvider("openai");
    setFormEndpoint(PROVIDER_OPTIONS[0].defaultEndpoint);
    setFormApiKey("");
    setShowApiKey(false);
    setFormModels(PROVIDER_OPTIONS[0].defaultModels);
    setFormActive(true);
    setEditingId(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: LLMApiProvider) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormProvider(p.provider);
    setFormEndpoint(p.apiEndpoint);
    setFormApiKey(p.apiKey ?? "");
    setShowApiKey(false);
    setFormModels(p.models.join(", "));
    setFormActive(p.isActive);
    setDialogOpen(true);
  };

  const handleProviderChange = (val: LLMApiProvider["provider"]) => {
    setFormProvider(val);
    const opt = PROVIDER_OPTIONS.find(p => p.value === val);
    if (opt && !editingId) {
      setFormEndpoint(val === 'boucio' ? '' : opt.defaultEndpoint);
      setFormModels(opt.defaultModels);
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || (formProvider !== 'boucio' && !formEndpoint.trim())) {
      toast({ title: "Validation Error", description: "Name and API Endpoint are required.", variant: "destructive" });
      return;
    }
    const input: LLMApiProviderInput = {
      name: formName.trim(),
      provider: formProvider,
      apiEndpoint: formEndpoint.trim(),
      apiKey: formApiKey,
      models: formModels.split(",").map(m => m.trim()).filter(Boolean),
      isActive: formActive,
    };
    try {
      if (editingId) {
        await llmApiConfigApi.updateProvider(editingId, input);
        toast({ title: "Provider Updated", description: `${input.name} has been updated.` });
      } else {
        await llmApiConfigApi.createProvider(input);
        toast({ title: "Provider Added", description: `${input.name} has been added.` });
      }
      setDialogOpen(false);
      resetForm();
      fetchProviders();
    } catch (err) {
      toastError(editingId ? "update this provider" : "add the provider", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await llmApiConfigApi.deleteProvider(id);
      toast({ title: "Provider Deleted" });
      fetchProviders();
    } catch (err) {
      toastError("delete this provider", err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await llmApiConfigApi.testConnection(id);
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err) {
      toastError("test this provider", err);
    }
  };

  const handleToggle = async (p: LLMApiProvider) => {
    try {
      await llmApiConfigApi.updateProvider(p.id, { isActive: !p.isActive });
      fetchProviders();
    } catch (err) {
      toastError("toggle this provider", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LLM Providers</h1>
          <p className="text-muted-foreground">
            Connect and manage LLM API providers for your organization.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Plug className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>Configure API connections to LLM providers such as OpenAI, Anthropic, Google AI, Azure OpenAI, or your own self-hosted models. API keys are stored securely and never exposed to the frontend.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPinned && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4 shrink-0" />
              <span>You are viewing providers for your organization only. Contact a Bouc.io admin to manage global providers.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading providers...</div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No LLM API providers configured yet. Click "Add Provider" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map(p => (
            <Card key={p.id} className={!p.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{providerLabel(p.provider)}</Badge>
                    {canSwitch && (
                      <Badge variant={p.orgId === null ? "secondary" : "outline"} className="text-xs">
                        {p.orgId === null ? "Global" : "Org"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.isActive} onCheckedChange={() => handleToggle(p)} />
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                  <ExternalLink className="h-3 w-3" />
                  {p.apiEndpoint}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        API Key: {p.apiKeySet ? (
                          <Badge variant="outline" className="ml-1 text-xs">Configured</Badge>
                        ) : (
                          <Badge variant="destructive" className="ml-1 text-xs">Not Set</Badge>
                        )}
                      </span>
                    </div>
                    {p.models.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.models.map(m => (
                          <Badge key={m} variant="secondary" className="text-xs font-mono">{m}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTest(p.id)}>
                      <TestTube className="mr-1 h-3.5 w-3.5" /> Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{p.name}"? This action cannot be undone. Any use case assignments using this provider will be cleared.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Provider" : "Add LLM API Provider"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the provider configuration." : "Configure a new LLM API connection for your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Display Name</Label>
              <Input id="provider-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. OpenAI Production" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-type">Provider</Label>
              <Select value={formProvider} onValueChange={v => handleProviderChange(v as LLMApiProvider["provider"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formProvider === 'boucio' ? (
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2">
                  Uses server-side <code className="font-mono">OLLAMA_URL</code> environment variable — no endpoint required.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="api-endpoint">API Endpoint</Label>
                <Input id="api-endpoint" value={formEndpoint} onChange={e => setFormEndpoint(e.target.value)} placeholder="https://api.openai.com/v1" />
              </div>
            )}
            {formProvider !== 'boucio' && (
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={formApiKey}
                    onChange={e => setFormApiKey(e.target.value)}
                    placeholder={editingId ? "leave blank to keep current" : "sk-..."}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="models">Available Models <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input id="models" value={formModels} onChange={e => setFormModels(e.target.value)} placeholder="gpt-4o, gpt-4o-mini" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="active" checked={formActive} onCheckedChange={setFormActive} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Add Provider"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
