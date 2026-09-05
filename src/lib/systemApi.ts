import { useState, useEffect, useCallback } from "react";
import { adminApiClient } from "./api";

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number | null;
  lastChecked: string | null;
  url: string;
}

// Map backend service shape (latency_ms, unconfigured status) to frontend type
function mapService(raw: Record<string, unknown>): ServiceHealth {
  const backendStatus = raw.status as string;
  const status: ServiceStatus =
    backendStatus === "unconfigured"
      ? "unknown"
      : (backendStatus as ServiceStatus);
  return {
    name: raw.name as string,
    status,
    latency: (raw.latency_ms as number | null) ?? null,
    lastChecked: (raw.lastChecked as string) ?? null,
    url: (raw.url as string) ?? "",
  };
}

async function fetchHealth(): Promise<ServiceHealth[]> {
  const res = await adminApiClient.get("/v1/admin/system/health");
  return (res.data.services as Record<string, unknown>[]).map(mapService);
}

export function useSystemApi() {
  const [services, setServices] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    fetchHealth()
      .then(setServices)
      .catch((err) => console.error("Failed to load system health", err));
  }, []);

  const checkAll = useCallback(async (): Promise<ServiceHealth[]> => {
    const updated = await fetchHealth();
    setServices(updated);
    return updated;
  }, []);

  const checkService = useCallback(
    async (index: number): Promise<ServiceHealth> => {
      const updated = await fetchHealth();
      setServices(updated);
      return updated[index] ?? services[index];
    },
    [services],
  );

  return { services, checkService, checkAll };
}
