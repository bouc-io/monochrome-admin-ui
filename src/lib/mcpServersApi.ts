import { adminApiClient } from "./api";

export type McpTransport = "http" | "sse";

export interface McpServer {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  authTokenSet: boolean;   // whether a token is stored
  authToken: string | null; // decrypted token, returned for edit pre-fill
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpServerInput {
  name: string;
  url: string;
  transport: McpTransport;
  authToken: string;       // empty string = leave unchanged on update
  enabled: boolean;
}

// Map snake_case backend row to camelCase frontend type
function mapServer(raw: Record<string, unknown>): McpServer {
  return {
    id: raw.id as string,
    name: raw.name as string,
    url: raw.url as string,
    transport: (raw.transport as McpTransport) ?? "http",
    authTokenSet: (raw.auth_token_set as boolean) ?? false,
    authToken: (raw.auth_token as string | null) ?? null,
    enabled: (raw.enabled as boolean) ?? true,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

export const mcpServersApi = {
  getServers: async (): Promise<McpServer[]> => {
    const res = await adminApiClient.get("/v1/admin/mcp-servers");
    return res.data.servers.map(mapServer);
  },

  createServer: async (input: McpServerInput): Promise<McpServer> => {
    const res = await adminApiClient.post("/v1/admin/mcp-servers", {
      name: input.name,
      url: input.url,
      transport: input.transport,
      auth_token: input.authToken || undefined,
      enabled: input.enabled,
    });
    return mapServer(res.data);
  },

  updateServer: async (id: string, input: Partial<McpServerInput>): Promise<McpServer> => {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.url !== undefined) body.url = input.url;
    if (input.transport !== undefined) body.transport = input.transport;
    if (input.authToken !== undefined) body.auth_token = input.authToken;
    if (input.enabled !== undefined) body.enabled = input.enabled;
    const res = await adminApiClient.put(`/v1/admin/mcp-servers/${id}`, body);
    return mapServer(res.data);
  },

  deleteServer: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/v1/admin/mcp-servers/${id}`);
  },
};
