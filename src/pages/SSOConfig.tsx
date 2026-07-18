import { useState, useEffect, useCallback } from "react";
import { Shield, CheckCircle, AlertCircle, Loader2, Copy, Plus, Trash2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrgScope } from "@/context/OrgScopeContext";
import { useOrgScopedToast } from "@/lib/orgScopedToast";
import {
  SSOConfiguration,
  SSOStatus,
  SsoRoleMapping,
  DEFAULT_SSO_CONFIG,
  fetchSsoConfig,
  saveSsoConfig,
  testSsoConnection,
  enableSso,
  disableSso,
} from "@/lib/ssoApi";
import { getEnvVar } from "@/auth/authUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSsoLoginUrl(idpAlias: string): string {
  const ssoBase = getEnvVar("VITE_SSO_SERVER_URL") || "";
  const realm = getEnvVar("VITE_OAUTH_REALM") || "users";
  const clientId = "oauth2-proxy";
  const redirectUri = `${window.location.origin}/oauth2/callback`;
  if (!ssoBase) return "";
  return (
    `${ssoBase}/realms/${realm}/protocol/openid-connect/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid+profile+email` +
    `&kc_idp_hint=${encodeURIComponent(idpAlias)}`
  );
}

function statusBadge(status: SSOStatus) {
  switch (status) {
    case "active":         return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    case "pending":        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "error":          return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
    case "disabled":       return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Disabled</Badge>;
    case "not_configured": return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Not Configured</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KEYCLOAK_ROLE_OPTIONS = [
  { value: "org_user",              label: "Org User" },
  { value: "org_admin",             label: "Org Admin" },
  { value: "org_admin_enterprise",  label: "Org Admin (Enterprise)" },
];

export default function SSOConfig() {
  const { activeOrgId } = useOrgScope();
  const { toast } = useToast();
  const { toastError } = useOrgScopedToast();

  const [config, setConfig] = useState<SSOConfiguration>({ ...DEFAULT_SSO_CONFIG });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [secretChanged, setSecretChanged] = useState(false);

  // Load config when active org changes
  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchSsoConfig(activeOrgId)
      .then((data) => { if (!cancelled) { setConfig(data); setSecretChanged(false); } })
      .catch((err) => { if (!cancelled) toastError("load SSO configuration", err); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [activeOrgId]);

  // ---------- OIDC field helpers ----------
  const setOidc = (field: string, value: string) =>
    setConfig((prev) => ({ ...prev, oidc: { ...prev.oidc!, [field]: value } }));

  // ---------- SAML field helpers ----------
  const setSaml = (field: string, value: string) =>
    setConfig((prev) => ({ ...prev, saml: { ...prev.saml!, [field]: value } }));

  // ---------- Role mapping helpers ----------
  const addRoleMapping = () =>
    setConfig((prev) => ({
      ...prev,
      roleMappings: [...(prev.roleMappings || []), { claim: "", claimValue: "", keycloakRole: "org_user" }],
    }));

  const updateRoleMapping = (idx: number, field: keyof SsoRoleMapping, value: string) =>
    setConfig((prev) => ({
      ...prev,
      roleMappings: prev.roleMappings.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }));

  const removeRoleMapping = (idx: number) =>
    setConfig((prev) => ({ ...prev, roleMappings: prev.roleMappings.filter((_, i) => i !== idx) }));

  // ---------- Actions ----------
  const handleSave = async () => {
    if (!activeOrgId) return;
    setIsSaving(true);
    try {
      const saved = await saveSsoConfig(activeOrgId, config);
      setConfig(saved);
      setSecretChanged(false);
      toast({ title: "SSO Configuration Saved", description: "Identity provider provisioned successfully." });
    } catch (err) {
      toastError("save SSO configuration", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!activeOrgId) return;
    setIsTesting(true);
    try {
      const result = await testSsoConnection(activeOrgId);
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err) {
      toastError("test the SSO connection", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!enabled) {
      setShowDisableDialog(true);
      return;
    }
    await doEnable();
  };

  const doEnable = async () => {
    if (!activeOrgId) return;
    setIsToggling(true);
    try {
      const result = await enableSso(activeOrgId);
      setConfig((prev) => ({ ...prev, status: result.status, enabledAt: result.enabledAt }));
      toast({ title: "SSO Enabled", description: "Users can now log in via your identity provider." });
    } catch (err) {
      toastError("enable SSO", err);
    } finally {
      setIsToggling(false);
    }
  };

  const doDisable = async () => {
    if (!activeOrgId) return;
    setShowDisableDialog(false);
    setIsToggling(true);
    try {
      const result = await disableSso(activeOrgId);
      setConfig((prev) => ({ ...prev, status: result.status, disabledAt: result.disabledAt }));
      toast({ title: "SSO Disabled", description: "Members must now log in via Google or direct credentials." });
    } catch (err) {
      toastError("disable SSO", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "SSO login URL copied to clipboard." });
  };

  // ---------- Derived state ----------
  const isConfigured = config.status !== "not_configured";
  const isActive = config.status === "active";
  const ssoLoginUrl = config.idpAlias ? buildSsoLoginUrl(config.idpAlias) : "";

  if (!activeOrgId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-muted-foreground">Select an organization to configure SSO.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> SSO Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure single sign-on for all users in your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {statusBadge(config.status)}
          {isConfigured && (
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isToggling || isLoading}
                aria-label="Toggle SSO"
              />
              <Label className="text-sm text-muted-foreground">{isActive ? "On" : "Off"}</Label>
            </div>
          )}
        </div>
      </div>

      {/* SSO Login URL (shown when active) */}
      {isActive && ssoLoginUrl && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">SSO Login URL</CardTitle>
            <CardDescription className="text-xs text-green-700 dark:text-green-400">
              Share this URL with your team members. It bypasses the standard login page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={ssoLoginUrl}
                className="font-mono text-xs bg-white dark:bg-black border-green-300"
              />
              <Button size="icon" variant="outline" onClick={() => handleCopyUrl(ssoLoginUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protocol tabs */}
      <Tabs
        value={config.protocol}
        onValueChange={(v) => setConfig((prev) => ({ ...prev, protocol: v as "oidc" | "saml" }))}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="oidc">OpenID Connect</TabsTrigger>
          <TabsTrigger value="saml">SAML</TabsTrigger>
        </TabsList>

        {/* OIDC tab */}
        <TabsContent value="oidc">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OpenID Connect Settings</CardTitle>
              <CardDescription>Enter your OIDC identity provider details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Discovery URL</label>
                <Input
                  placeholder="https://your-idp.com/.well-known/openid-configuration"
                  value={config.oidc?.discoveryUrl || ""}
                  onChange={(e) => setOidc("discoveryUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The OIDC discovery endpoint. Must be accessible from the server.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Client ID</label>
                <Input
                  placeholder="your-client-id"
                  value={config.oidc?.clientId || ""}
                  onChange={(e) => setOidc("clientId", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Client Secret
                  {config.oidc?.clientSecretSet && !secretChanged && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(already set)</span>
                  )}
                </label>
                {config.oidc?.clientSecretSet && !secretChanged ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value="••••••••••••••••" className="font-mono text-muted-foreground" />
                    <Button size="sm" variant="outline" onClick={() => {
                      setSecretChanged(true);
                      setOidc("clientSecret", "");
                    }}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="password"
                    placeholder="Enter new client secret"
                    value={config.oidc?.clientSecret || ""}
                    onChange={(e) => setOidc("clientSecret", e.target.value)}
                    autoFocus={secretChanged}
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Extra Scopes</label>
                <Input
                  placeholder="groups roles"
                  value={config.oidc?.extraScopes || ""}
                  onChange={(e) => setOidc("extraScopes", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Space-separated additional scopes beyond openid, profile, email.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Email Domain</label>
                <Input
                  placeholder="acme.com"
                  value={config.oidc?.emailDomain || ""}
                  onChange={(e) => setOidc("emailDomain", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Users with this email domain are auto-redirected to your IdP.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAML tab */}
        <TabsContent value="saml">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SAML Settings</CardTitle>
              <CardDescription>Enter your SAML identity provider details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Entity ID</label>
                <Input
                  placeholder="https://your-idp.com/entity-id"
                  value={config.saml?.entityId || ""}
                  onChange={(e) => setSaml("entityId", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">SSO URL</label>
                <Input
                  placeholder="https://your-idp.com/sso"
                  value={config.saml?.ssoUrl || ""}
                  onChange={(e) => setSaml("ssoUrl", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Signing Certificate (PEM)</label>
                <Textarea
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={5}
                  value={config.saml?.certificate || ""}
                  onChange={(e) => setSaml("certificate", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Metadata URL</label>
                <Input
                  placeholder="https://your-idp.com/metadata"
                  value={config.saml?.metadataUrl || ""}
                  onChange={(e) => setSaml("metadataUrl", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name ID Format</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={config.saml?.nameIdFormat || ""}
                  onChange={(e) => setSaml("nameIdFormat", e.target.value)}
                >
                  <option value="">Email (default)</option>
                  <option value="email">Email</option>
                  <option value="persistent">Persistent</option>
                  <option value="transient">Transient</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  How the IdP identifies users in its SAML assertion. Leave as default unless your IdP requires a specific format.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Email Domain</label>
                <Input
                  placeholder="acme.com"
                  value={config.saml?.emailDomain || ""}
                  onChange={(e) => setSaml("emailDomain", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Mappings</CardTitle>
          <CardDescription>
            Map IdP claim values to Bouc.io roles. All SSO users receive <code>org_user</code> by default.
            Add mappings to promote specific groups to admin roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.roleMappings.map((mapping, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <Input
                placeholder="Claim name (e.g. groups)"
                value={mapping.claim}
                onChange={(e) => updateRoleMapping(idx, "claim", e.target.value)}
              />
              <Input
                placeholder="Claim value (e.g. admins)"
                value={mapping.claimValue}
                onChange={(e) => updateRoleMapping(idx, "claimValue", e.target.value)}
              />
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={mapping.keycloakRole}
                onChange={(e) => updateRoleMapping(idx, "keycloakRole", e.target.value)}
              >
                {KEYCLOAK_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Button size="icon" variant="ghost" onClick={() => removeRoleMapping(idx)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addRoleMapping}>
            <Plus className="h-4 w-4 mr-2" /> Add Mapping
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isConfigured ? "Save & Re-provision" : "Save & Enable"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || !isConfigured || isLoading}
          title="Tests the last saved configuration — not the current form values. Save first to test edits."
        >
          {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Connection
        </Button>
      </div>

      {/* Disable confirmation dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable SSO?</AlertDialogTitle>
            <AlertDialogDescription>
              All organization members will lose the ability to log in via your identity provider.
              They will need to use Google OAuth or Keycloak credentials instead.
              The SSO configuration is preserved and can be re-enabled at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disable SSO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
