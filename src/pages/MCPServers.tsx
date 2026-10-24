import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Pencil,
  Key,
  Plug,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  mcpServersApi,
  type McpServer,
  type McpServerInput,
  type McpTransport,
} from "@/lib/mcpServersApi";
import { useOrgScopedToast } from "@/lib/orgScopedToast";

const TRANSPORT_OPTIONS: { value: McpTransport; label: string }[] = [
  { value: "http", label: "Streamable HTTP" },
  { value: "sse", label: "Server-Sent Events (SSE)" },
];

const transportLabel = (val: string) =>
  TRANSPORT_OPTIONS.find((t) => t.value === val)?.label ?? val;

export default function MCPServers() {
  const { toast } = useToast();
  const { toastError } = useOrgScopedToast();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTransport, setFormTransport] = useState<McpTransport>("http");
  const [formToken, setFormToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const data = await mcpServersApi.getServers();
      setServers(data);
    } catch (err) {
      toastError("load MCP servers", err);
    } finally {
      setLoading(false);
    }
  };

  // MCP servers are global infra config — fetch once on mount.
  useEffect(() => {
    fetchServers();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormTransport("http");
    setFormToken("");
    setShowToken(false);
    setFormEnabled(true);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (s: McpServer) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormUrl(s.url);
    setFormTransport(s.transport);
    setFormToken(s.authToken ?? ""); // pre-fill decrypted token; blank = keep existing
    setShowToken(false);
    setFormEnabled(s.enabled);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and URL are required.",
        variant: "destructive",
      });
      return;
    }
    const input: McpServerInput = {
      name: formName.trim(),
      url: formUrl.trim(),
      transport: formTransport,
      authToken: formToken,
      enabled: formEnabled,
    };
    try {
      if (editingId) {
        await mcpServersApi.updateServer(editingId, input);
        toast({
          title: "MCP Server Updated",
          description: `${input.name} has been updated.`,
        });
      } else {
        await mcpServersApi.createServer(input);
        toast({
          title: "MCP Server Added",
          description: `${input.name} has been added.`,
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchServers();
    } catch (err) {
      toastError(
        editingId ? "update this MCP server" : "add the MCP server",
        err,
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await mcpServersApi.deleteServer(id);
      toast({ title: "MCP Server Deleted" });
      fetchServers();
    } catch (err) {
      toastError("delete this MCP server", err);
    }
  };

  const handleToggle = async (s: McpServer) => {
    try {
      await mcpServersApi.updateServer(s.id, { enabled: !s.enabled });
      fetchServers();
    } catch (err) {
      toastError("toggle this MCP server", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP Servers</h1>
          <p className="text-muted-foreground">
            Connect external Model Context Protocol servers to expose their
            tools to the agent.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Server
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Plug className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                The agent discovers each server's tools at runtime and exposes
                them to the LLM, namespaced as{" "}
                <code className="font-mono">servername__toolname</code>. Auth
                tokens are stored encrypted and never returned to the browser.
                Changes are picked up by the agent within ~1 minute.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading MCP servers...
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No MCP servers configured yet. Click "Add Server" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {servers.map((s) => (
            <Card key={s.id} className={!s.enabled ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{s.name}</CardTitle>
                    <Badge variant={s.enabled ? "default" : "secondary"}>
                      {s.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant="outline">
                      {transportLabel(s.transport)}
                    </Badge>
                  </div>
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={() => handleToggle(s)}
                  />
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                  <ExternalLink className="h-3 w-3" />
                  {s.url}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Auth Token:{" "}
                      {s.authTokenSet ? (
                        <Badge variant="outline" className="ml-1 text-xs">
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          None
                        </Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{s.name}"? This
                            action cannot be undone. The agent will stop
                            offering this server's tools.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)}>
                            Delete
                          </AlertDialogAction>
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
            <DialogTitle>
              {editingId ? "Edit MCP Server" : "Add MCP Server"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the MCP server configuration."
                : "Register a new Model Context Protocol server."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. github-mcp"
              />
              <p className="text-xs text-muted-foreground">
                Used as the tool-name prefix. Letters, digits, hyphens.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Server URL</Label>
              <Input
                id="mcp-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://mcp.example.com/mcp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-transport">Transport</Label>
              <Select
                value={formTransport}
                onValueChange={(v) => setFormTransport(v as McpTransport)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-token">
                Auth Token{" "}
                <span className="text-muted-foreground text-xs">
                  (optional, sent as Bearer)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="mcp-token"
                  type={showToken ? "text" : "password"}
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  placeholder={
                    editingId ? "leave blank to keep current" : "token..."
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="mcp-enabled"
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
              <Label htmlFor="mcp-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Server"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
