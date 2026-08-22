import { adminApiClient } from "./api";

export interface LLMApiProvider {
  id: string;
  orgId: string | null;           // null = global; non-null = org-specific
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom' | 'ollama' | 'boucio';
  apiEndpoint: string;
  apiKeySet: boolean;
  apiKey: string | null;          // decrypted key returned by server for edit pre-fill
  models: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LLMApiProviderInput {
  name: string;
  provider: LLMApiProvider['provider'];
  apiEndpoint: string;
  apiKey: string;
  models: string[];
  isActive: boolean;
}

export type UseCaseKey = 'chatbot' | 'agent_plan' | 'agent_execution' | 'memory_distiller' | 'memory_embedding';

export interface UseCaseAssignment {
  providerId: string;
  model: string;
  enableReasoning: boolean;
  orgId: string | null;           // null = global assignment; non-null = org-specific override
}

export const USE_CASE_LABELS: Record<UseCaseKey, { label: string; description: string }> = {
  chatbot: { label: 'Chatbot', description: 'Main conversational LLM for user chat interactions' },
  agent_plan: { label: 'Agent — Planning', description: 'LLM used by the agent to generate execution plans' },
  agent_execution: { label: 'Agent — Execution', description: 'LLM for tool calls, execution steps, and final summary' },
  memory_distiller: { label: 'Memory Distiller', description: 'LLM that distills and summarizes conversation memory' },
  memory_embedding: { label: 'Memory — Embedding', description: 'Embedding model used to vectorize memories for semantic search and retrieval' },
};

// Map snake_case backend provider to camelCase frontend type
function mapProvider(raw: Record<string, unknown>): LLMApiProvider {
  return {
    id: raw.id as string,
    orgId: (raw.org_id as string | null) ?? null,
    name: raw.name as string,
    provider: raw.provider as LLMApiProvider['provider'],
    apiEndpoint: raw.api_endpoint as string,
    apiKeySet: raw.api_key_set as boolean,
    apiKey: (raw.api_key as string | null) ?? null,
    models: raw.models as string[],
    isActive: raw.is_active as boolean,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}

const USE_CASE_KEYS: UseCaseKey[] = ['chatbot', 'agent_plan', 'agent_execution', 'memory_distiller', 'memory_embedding'];

// Transform the assignments array from the backend into a Record keyed by use_case
function mapAssignments(
  raw: Record<string, unknown>[]
): Record<UseCaseKey, UseCaseAssignment | null> {
  const result: Record<UseCaseKey, UseCaseAssignment | null> = {
    chatbot: null,
    agent_plan: null,
    agent_execution: null,
    memory_distiller: null,
    memory_embedding: null,
  };
  for (const item of raw) {
    const useCase = item.use_case as UseCaseKey;
    if (USE_CASE_KEYS.includes(useCase) && item.provider_id) {
      result[useCase] = {
        providerId: item.provider_id as string,
        model: (item.model as string) ?? "",
        enableReasoning: (item.enable_reasoning as boolean) ?? false,
        orgId: (item.org_id as string | null) ?? null,
      };
    }
  }
  return result;
}

export const llmApiConfigApi = {
  getProviders: async (): Promise<LLMApiProvider[]> => {
    const res = await adminApiClient.get("/v1/admin/llm-providers");
    return res.data.providers.map(mapProvider);
  },

  createProvider: async (input: LLMApiProviderInput): Promise<LLMApiProvider> => {
    const res = await adminApiClient.post("/v1/admin/llm-providers", {
      name: input.name,
      provider: input.provider,
      api_endpoint: input.apiEndpoint,
      api_key: input.apiKey || undefined,
      models: input.models,
      is_active: input.isActive,
    });
    return mapProvider(res.data);
  },

  updateProvider: async (id: string, input: Partial<LLMApiProviderInput>): Promise<LLMApiProvider> => {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.provider !== undefined) body.provider = input.provider;
    if (input.apiEndpoint !== undefined) body.api_endpoint = input.apiEndpoint;
    if (input.apiKey !== undefined) body.api_key = input.apiKey;
    if (input.models !== undefined) body.models = input.models;
    if (input.isActive !== undefined) body.is_active = input.isActive;
    const res = await adminApiClient.put(`/v1/admin/llm-providers/${id}`, body);
    return mapProvider(res.data);
  },

  deleteProvider: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/v1/admin/llm-providers/${id}`);
  },

  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await adminApiClient.post(`/v1/admin/llm-providers/${id}/test`);
    const { success, latency_ms, error } = res.data;
    const message = success
      ? `Connection successful (${latency_ms}ms)`
      : (error ?? "Connection failed");
    return { success, message };
  },

  getUseCaseAssignments: async (): Promise<Record<UseCaseKey, UseCaseAssignment | null>> => {
    const res = await adminApiClient.get("/v1/admin/llm-assignments");
    return mapAssignments(res.data.assignments);
  },

  setUseCaseAssignment: async (useCase: UseCaseKey, assignment: UseCaseAssignment | null): Promise<void> => {
    await adminApiClient.put(`/v1/admin/llm-assignments/${useCase}`, {
      providerId: assignment?.providerId ?? null,
      model: assignment?.model ?? null,
      enableReasoning: assignment?.enableReasoning ?? false,
    });
  },
};
