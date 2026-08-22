import { adminApiClient } from "./api";

// ---------------------------------------------------------------------------
// Types (mirror backend src/types/sso.ts — frontend-safe, no encrypted fields)
// ---------------------------------------------------------------------------

export type SSOProtocol = "oidc" | "saml";
export type SSOStatus = "pending" | "active" | "error" | "disabled" | "not_configured";

export interface SsoRoleMapping {
  claim: string;
  claimValue: string;       // mapped from claim_value on the wire
  keycloakRole: "org_admin" | "org_admin_enterprise" | "org_user";
}

export interface OIDCConfig {
  discoveryUrl: string;     // maps to discovery_url on the wire
  clientId: string;
  /** Write-only. Omit on update to keep existing. On read, always empty string (see clientSecretSet). */
  clientSecret: string;
  /** True when a client secret is already stored; false on first configuration. */
  clientSecretSet: boolean;
  extraScopes: string;
  emailDomain: string;
}

export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  metadataUrl: string;
  nameIdFormat: "email" | "persistent" | "transient" | "";
  emailDomain: string;
}

export interface SSOConfiguration {
  protocol: SSOProtocol;
  status: SSOStatus;
  /** Read-only. "org-{slug}" — set by server. Used to generate SSO login URL. */
  idpAlias?: string;
  oidc?: OIDCConfig;
  saml?: SAMLConfig;
  roleMappings: SsoRoleMapping[];
  lastTestAt?: string;
  lastTestSuccess?: boolean;
  enabledAt?: string;
  disabledAt?: string;
  updatedAt?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// Default empty state used before loading
export const DEFAULT_SSO_CONFIG: SSOConfiguration = {
  protocol: "oidc",
  status: "not_configured",
  idpAlias: undefined,
  oidc: { discoveryUrl: "", clientId: "", clientSecret: "", clientSecretSet: false, extraScopes: "", emailDomain: "" },
  saml: { entityId: "", ssoUrl: "", certificate: "", metadataUrl: "", nameIdFormat: "", emailDomain: "" },
  roleMappings: [],
};

// ---------------------------------------------------------------------------
// Wire translation helpers (snake_case API ↔ camelCase frontend)
// ---------------------------------------------------------------------------

function fromApi(data: Record<string, any>): SSOConfiguration {
  if (!data.protocol) {
    return { ...DEFAULT_SSO_CONFIG, status: "not_configured" };
  }

  const base: SSOConfiguration = {
    protocol: data.protocol,
    status: data.status,
    idpAlias: data.idp_alias,
    roleMappings: (data.role_mappings || []).map((m: any) => ({
      claim: m.claim,
      claimValue: m.claim_value,
      keycloakRole: m.keycloak_role,
    })),
    lastTestAt: data.last_test_at,
    lastTestSuccess: data.last_test_success,
    enabledAt: data.enabled_at,
    disabledAt: data.disabled_at,
    updatedAt: data.updated_at,
    // Provide defaults for both tabs so the form never crashes
    oidc: { discoveryUrl: "", clientId: "", clientSecret: "", clientSecretSet: false, extraScopes: "", emailDomain: "" },
    saml: { entityId: "", ssoUrl: "", certificate: "", metadataUrl: "", nameIdFormat: "", emailDomain: "" },
  };

  if (data.protocol === "oidc") {
    base.oidc = {
      discoveryUrl: data.discovery_url || "",
      clientId: data.client_id || "",
      clientSecret: "",                         // never returned by API
      clientSecretSet: !!data.client_secret_set,
      extraScopes: data.extra_scopes || "",
      emailDomain: data.email_domain || "",
    };
  } else if (data.protocol === "saml") {
    base.saml = {
      entityId: data.entity_id || "",
      ssoUrl: data.sso_url || "",
      certificate: data.certificate || "",
      metadataUrl: data.metadata_url || "",
      nameIdFormat: data.name_id_format || "",
      emailDomain: data.email_domain || "",
    };
  }

  return base;
}

function toApiPayload(config: SSOConfiguration): Record<string, any> {
  const roleMappings = config.roleMappings.map((m) => ({
    claim: m.claim,
    claim_value: m.claimValue,
    keycloak_role: m.keycloakRole,
  }));

  if (config.protocol === "oidc") {
    const oidc = config.oidc!;
    const payload: Record<string, any> = {
      protocol: "oidc",
      discovery_url: oidc.discoveryUrl,
      client_id: oidc.clientId,
      extra_scopes: oidc.extraScopes || undefined,
      email_domain: oidc.emailDomain || undefined,
      role_mappings: roleMappings,
    };
    // Only include client_secret if the user entered one (omit = keep existing encrypted value)
    if (oidc.clientSecret) payload.client_secret = oidc.clientSecret;
    return payload;
  }

  const saml = config.saml!;
  return {
    protocol: "saml",
    entity_id: saml.entityId,
    sso_url: saml.ssoUrl,
    certificate: saml.certificate,
    metadata_url: saml.metadataUrl || undefined,
    name_id_format: saml.nameIdFormat || undefined,
    email_domain: saml.emailDomain || undefined,
    role_mappings: roleMappings,
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchSsoConfig(orgId: string): Promise<SSOConfiguration> {
  const resp = await adminApiClient.get(`/v1/admin/organizations/${orgId}/sso`);
  return fromApi(resp.data);
}

export async function saveSsoConfig(orgId: string, config: SSOConfiguration): Promise<SSOConfiguration> {
  const resp = await adminApiClient.put(`/v1/admin/organizations/${orgId}/sso`, toApiPayload(config));
  return fromApi(resp.data);
}

export async function testSsoConnection(orgId: string): Promise<TestConnectionResult> {
  const resp = await adminApiClient.post(`/v1/admin/organizations/${orgId}/sso/test`);
  return resp.data as TestConnectionResult;
}

export async function enableSso(orgId: string): Promise<{ status: SSOStatus; enabledAt: string }> {
  const resp = await adminApiClient.post(`/v1/admin/organizations/${orgId}/sso/enable`);
  return { status: resp.data.status, enabledAt: resp.data.enabled_at };
}

export async function disableSso(orgId: string): Promise<{ status: SSOStatus; disabledAt: string }> {
  const resp = await adminApiClient.post(`/v1/admin/organizations/${orgId}/sso/disable`);
  return { status: resp.data.status, disabledAt: resp.data.disabled_at };
}

export async function deleteSsoConfig(orgId: string): Promise<void> {
  await adminApiClient.delete(`/v1/admin/organizations/${orgId}/sso`);
}
