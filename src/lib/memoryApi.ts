import { useContext, useCallback } from "react";
import { AuthContext } from "@/auth/authcontext";
import axios from "axios";
import logger from "@/lib/logger";

const log = logger.child("MemoryAPI");

// Function to get environment variable with fallback to import.meta.env
const getEnvVar = (key: keyof Window["ENV"]): string => {
  return window.ENV?.[key] || import.meta.env[key] || "";
};

// Create a dedicated axios instance for memory API
const memoryAxios = axios.create({
  baseURL: getEnvVar("VITE_API_URL"),
  headers: {
    "Content-Type": "application/json",
  },
});

// Category type
export type MemoryCategory =
  "persona" | "preference" | "fact" | "context" | "instruction";

// Importance type
export type MemoryImportance = "critical" | "high" | "medium" | "low";

// Source type
export type MemorySource = "manual" | "inferred" | "imported";

// Memory interface matching the API response format
export interface MemoryResponse {
  memory_id: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags: string[];
  created_at: string;
  updated_at: string;
  access_count: number;
  last_accessed_at: string | null;
  source: MemorySource;
  is_active?: boolean;
}

// Internal memory representation for state management
export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date | null;
  source: MemorySource;
  isActive: boolean;
}

// Pagination interface
export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

// List memories response
export interface ListMemoriesResponse {
  data: MemoryResponse[];
  pagination: Pagination;
}

// Memory stats response
export interface MemoryStatsResponse {
  total_memories: number;
  active_memories: number;
  inactive_memories: number;
  by_category: Record<MemoryCategory, number>;
  by_importance: Record<MemoryImportance, number>;
  by_source: Record<MemorySource, number>;
  most_accessed: Array<{
    memory_id: string;
    content: string;
    category: MemoryCategory;
    importance: MemoryImportance;
    access_count: number;
  }>;
  recently_updated: Array<{
    memory_id: string;
    content: string;
    updated_at: string;
  }>;
  storage_size_mb: number;
}

// Internal memory stats representation
export interface MemoryStats {
  totalMemories: number;
  activeMemories: number;
  inactiveMemories: number;
  byCategory: Record<MemoryCategory, number>;
  byImportance: Record<MemoryImportance, number>;
  bySource: Record<MemorySource, number>;
  mostAccessed: Array<{
    memoryId: string;
    content: string;
    category: MemoryCategory;
    importance: MemoryImportance;
    accessCount: number;
  }>;
  recentlyUpdated: Array<{
    memoryId: string;
    content: string;
    updatedAt: Date;
  }>;
  storageSizeMb: number;
}

// Create memory request
export interface CreateMemoryRequest {
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags?: string[];
  metadata?: {
    source_assignment_id?: string;
    source_message_id?: string;
    source_type?: MemorySource;
  };
}

// Backward compatibility aliases
export type CreateMemoryInput = CreateMemoryRequest;

// Update memory request
export interface UpdateMemoryRequest {
  content?: string;
  category?: MemoryCategory;
  importance?: MemoryImportance;
  tags?: string[];
  is_active?: boolean;
}

// Alias for backward compatibility
export type UpdateMemoryInput = UpdateMemoryRequest;

// List memories query params
export interface ListMemoriesParams {
  category?: MemoryCategory;
  importance?: MemoryImportance;
  tags?: string;
  search?: string;
  source?: MemorySource;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// Delete memory response
export interface DeleteMemoryResponse {
  success: boolean;
  memory_id: string;
  deleted_at: string;
}

// Helper function to convert API response to internal Memory format
const convertMemoryResponse = (response: MemoryResponse): Memory => ({
  id: response.memory_id,
  content: response.content,
  category: response.category,
  importance: response.importance,
  tags: response.tags || [],
  createdAt: new Date(response.created_at),
  updatedAt: new Date(response.updated_at),
  accessCount: response.access_count || 0,
  lastAccessedAt: response.last_accessed_at
    ? new Date(response.last_accessed_at)
    : null,
  source: response.source,
  isActive: response.is_active !== undefined ? response.is_active : true,
});

// Helper function to convert stats response
const convertStatsResponse = (response: MemoryStatsResponse): MemoryStats => ({
  totalMemories: response.total_memories,
  activeMemories: response.active_memories,
  inactiveMemories: response.inactive_memories,
  byCategory: response.by_category,
  byImportance: response.by_importance,
  bySource: response.by_source,
  mostAccessed: response.most_accessed.map((item) => ({
    memoryId: item.memory_id,
    content: item.content,
    category: item.category,
    importance: item.importance,
    accessCount: item.access_count,
  })),
  recentlyUpdated: response.recently_updated.map((item) => ({
    memoryId: item.memory_id,
    content: item.content,
    updatedAt: new Date(item.updated_at),
  })),
  storageSizeMb: response.storage_size_mb,
});

// UI helper data for styling
export const categoryColors: Record<MemoryCategory, string> = {
  persona: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  preference:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fact: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  context:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  instruction:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export const importanceColors: Record<MemoryImportance, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-muted-foreground/30",
};

export const categoryIcons: Record<MemoryCategory, string> = {
  persona: "🎭",
  preference: "⚙️",
  fact: "📋",
  context: "🌍",
  instruction: "📝",
};

export const useMemoryApi = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useMemoryApi must be used within AuthProvider");
  }

  // GET /v1/memories - List all memories
  const getAllMemories = useCallback(
    async (
      params?: ListMemoriesParams,
    ): Promise<{ memories: Memory[]; pagination: Pagination }> => {
      log.info("Retrieving all memories...", params);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await memoryAxios.get<ListMemoriesResponse>(
            "/v1/memories",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
              params: params,
            },
          );

          log.debug("Memories retrieved successfully:", {
            count: response.data.data.length,
            total: response.data.pagination.total,
            attempt: retryCount + 1,
          });

          const memories = response.data.data.map(convertMemoryResponse);

          return {
            memories,
            pagination: response.data.pagination,
          };
        } catch (error) {
          retryCount++;
          log.error(
            `Error retrieving memories (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for getAllMemories");
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to retrieve memories after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  // GET /v1/memories/{memory_id} - Get memory by ID
  const getMemoryById = useCallback(
    async (memoryId: string): Promise<Memory> => {
      log.info("Retrieving memory:", memoryId);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await memoryAxios.get<MemoryResponse>(
            `/v1/memories/${memoryId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.debug("Memory retrieved successfully:", {
            memoryId,
            attempt: retryCount + 1,
          });

          return convertMemoryResponse(response.data);
        } catch (error) {
          retryCount++;
          log.error(
            `Error retrieving memory (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for getMemoryById");
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to retrieve memory after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  // POST /v1/memories - Create memory
  const createMemory = useCallback(
    async (memoryData: CreateMemoryRequest): Promise<Memory> => {
      log.info("Creating new memory:", memoryData);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await memoryAxios.post<MemoryResponse>(
            "/v1/memories",
            memoryData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.debug("Memory created successfully:", {
            attempt: retryCount + 1,
            data: response.data,
          });

          return convertMemoryResponse(response.data);
        } catch (error) {
          retryCount++;
          log.error(
            `Error creating memory (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for createMemory");
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to create memory after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  // PATCH /v1/memories/{memory_id} - Update memory
  const updateMemory = useCallback(
    async (
      memoryId: string,
      updateData: UpdateMemoryRequest,
    ): Promise<Memory> => {
      log.info("Updating memory:", memoryId, updateData);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await memoryAxios.patch<MemoryResponse>(
            `/v1/memories/${memoryId}`,
            updateData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.debug("Memory updated successfully:", {
            memoryId,
            attempt: retryCount + 1,
            updatedData: response.data,
          });

          return convertMemoryResponse(response.data);
        } catch (error) {
          retryCount++;
          log.error(
            `Error updating memory (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for updateMemory");
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to update memory after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  // DELETE /v1/memories/{memory_id} - Delete memory
  const deleteMemory = useCallback(
    async (memoryId: string): Promise<void> => {
      log.info("Deleting memory:", memoryId);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          await memoryAxios.delete<DeleteMemoryResponse>(
            `/v1/memories/${memoryId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.debug("Memory deleted successfully:", {
            memoryId,
            attempt: retryCount + 1,
          });

          return;
        } catch (error) {
          retryCount++;
          log.error(
            `Error deleting memory (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for deleteMemory");
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error("Failed to delete memory after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  // GET /v1/memories/stats - Get memory statistics
  const getMemoryStats = useCallback(async (): Promise<MemoryStats> => {
    log.info("Retrieving memory statistics...");

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const token = authContext.authTokens?.access;
        if (!token) {
          throw new Error("No authentication token available");
        }

        const response = await memoryAxios.get<MemoryStatsResponse>(
          "/v1/memories/stats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-auth-request-access-token": token,
            },
          },
        );

        log.debug("Memory stats retrieved successfully:", {
          attempt: retryCount + 1,
          totalMemories: response.data.total_memories,
        });

        return convertStatsResponse(response.data);
      } catch (error) {
        retryCount++;
        log.error(
          `Error retrieving memory stats (attempt ${retryCount}/${maxRetries}):`,
          error,
        );

        if (retryCount >= maxRetries) {
          log.error("Max retries reached for getMemoryStats");
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error("Failed to retrieve memory stats after maximum retries");
  }, [authContext.authTokens?.access]);

  // Helper: Toggle memory active state
  const toggleMemoryActive = useCallback(
    async (memoryId: string): Promise<Memory> => {
      // First get the current state, then toggle it
      const currentMemory = await getMemoryById(memoryId);
      return updateMemory(memoryId, { is_active: !currentMemory.isActive });
    },
    [getMemoryById, updateMemory],
  );

  // POST /v1/memories/search - Semantic search using vector similarity
  const searchMemories = useCallback(
    async (
      query: string,
      limit = 10,
      minRelevance = 0.5,
    ): Promise<
      Array<{
        memoryId: string;
        content: string;
        category: MemoryCategory;
        relevanceScore: number;
      }>
    > => {
      const token = authContext.authTokens?.access;
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await memoryAxios.post(
        "/v1/memories/search",
        {
          query,
          limit,
          min_relevance: minRelevance,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-auth-request-access-token": token,
          },
        },
      );

      return ((response.data as any).results || []).map(
        (r: {
          memory_id: string;
          content: string;
          category: MemoryCategory;
          relevance_score: number;
        }) => ({
          memoryId: r.memory_id,
          content: r.content,
          category: r.category,
          relevanceScore: r.relevance_score,
        }),
      );
    },
    [authContext.authTokens?.access],
  );

  return {
    getAllMemories,
    getMemoryById,
    createMemory,
    updateMemory,
    deleteMemory,
    getMemoryStats,
    toggleMemoryActive,
    searchMemories,
  };
};
