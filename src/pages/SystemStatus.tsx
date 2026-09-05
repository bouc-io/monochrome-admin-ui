import { useState } from "react";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystemApi, ServiceStatus } from "@/lib/systemApi";

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "bg-green-500";
    case "degraded":
      return "bg-yellow-500";
    case "down":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    default:
      return "Unknown";
  }
}

export default function SystemStatus() {
  const { services, checkService, checkAll } = useSystemApi();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState<number | null>(null);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await checkAll();
    setRefreshing(false);
  };

  const handleCheckService = async (index: number) => {
    setCheckingIndex(index);
    await checkService(index);
    setCheckingIndex(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6" /> System Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor the health of all platform services.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service, index) => (
          <Card key={service.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {service.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${statusColor(service.status)}`}
                />
                <Badge variant="outline" className="text-xs">
                  {statusLabel(service.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Latency</span>
                  <span>
                    {service.latency !== null ? `${service.latency}ms` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Last checked</span>
                  <span>
                    {service.lastChecked
                      ? new Date(service.lastChecked).toLocaleTimeString()
                      : "Never"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => handleCheckService(index)}
                  disabled={checkingIndex === index}
                >
                  {checkingIndex === index ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Check Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
