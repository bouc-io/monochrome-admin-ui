import axios from "axios";

declare global {
    interface Window {
        ENV: {
            VITE_API_URL: string;
            VITE_OLLAMA_API_URL: string;
            VITE_SSO_SERVER_URL: string;
            VITE_OAUTH_REALM: string;
            VITE_OAUTH_CLIENT_ID: string;
            VITE_IDENTITY_PROVIDER: string;
            VITE_AVAILABLE_MODELS: string;
        };
    }
}

const getApiUrl = (): string => window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || '';

// Creating an instance for axios to be used by the token interceptor service
const instance = axios.create({
    baseURL: `${getApiUrl()}/`,
    headers: {
        "Content-Type": "application/json",
    },
});

export const adminApiClient = axios.create({
    baseURL: getApiUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

// Active org scope — set by OrgScopeProvider, attached as X-Active-Org header
let activeOrgIdHolder: string | null = null;
export const setActiveOrgIdRef = (id: string | null) => {
    activeOrgIdHolder = id;
};
export const getActiveOrgIdRef = (): string | null => activeOrgIdHolder;

adminApiClient.interceptors.request.use((config) => {
    if (activeOrgIdHolder && config.headers) {
        (config.headers as Record<string, string>)["X-Active-Org"] = activeOrgIdHolder;
    }
    return config;
});

// Heuristic: which admin routes are NOT org-scoped (so a missing X-Active-Org is fine).
const NON_SCOPED_ADMIN_PATHS = [
    /\/v1\/admin\/organizations(\/|$|\?)/,
    /\/v1\/admin\/mcp-servers(\/|$|\?)/, // global infra config, not org-scoped
];

const isScopedAdminPath = (url: string | undefined): boolean => {
    if (!url) return false;
    if (!url.includes("/v1/admin/")) return false;
    return !NON_SCOPED_ADMIN_PATHS.some((re) => re.test(url));
};

export interface OrgScopeErrorMeta {
    kind: "forbidden" | "missing-org" | "not-found" | "server" | "network" | "unknown";
    activeOrgId: string | null;
    serverMessage?: string;
}

declare module "axios" {
    interface AxiosError {
        __orgScopeIssue?: OrgScopeErrorMeta;
    }
}

adminApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status: number | undefined = error?.response?.status;
        const url: string | undefined = error?.config?.url;
        const sentOrg = (error?.config?.headers?.["X-Active-Org"] as string | undefined) ?? null;
        const scoped = isScopedAdminPath(url);
        const serverMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            (typeof error?.response?.data === "string" ? error.response.data : undefined);

        let meta: OrgScopeErrorMeta | undefined;
        if (scoped && !sentOrg) {
            meta = { kind: "missing-org", activeOrgId: null, serverMessage };
        } else if (status === 403 && scoped) {
            meta = { kind: "forbidden", activeOrgId: sentOrg, serverMessage };
        } else if (status === 404 && scoped && sentOrg) {
            meta = { kind: "not-found", activeOrgId: sentOrg, serverMessage };
        } else if (status && status >= 500) {
            meta = { kind: "server", activeOrgId: sentOrg, serverMessage };
        } else if (!error?.response) {
            meta = { kind: "network", activeOrgId: sentOrg, serverMessage };
        } else if (scoped) {
            meta = { kind: "unknown", activeOrgId: sentOrg, serverMessage };
        }

        if (meta) error.__orgScopeIssue = meta;
        return Promise.reject(error);
    }
);

export default instance;