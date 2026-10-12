import { useCallback } from "react";
import { isAxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import { useOrgScope } from "@/context/OrgScopeContext";
import type { OrgScopeErrorMeta } from "@/lib/api";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Returns toast helpers that automatically include the active organization
 * in API failure messages, and translate org-scope-related errors (403,
 * missing X-Active-Org, etc.) into clear, actionable copy.
 */
export function useOrgScopedToast() {
  const { toast } = useToast();
  const { activeOrg, activeOrgId } = useOrgScope();

  const orgLabel = activeOrg?.name || activeOrgId || "current organization";

  const toastError = useCallback(
    (action: string, error: unknown) => {
      const meta: OrgScopeErrorMeta | undefined = isAxiosError(error)
        ? error.__orgScopeIssue
        : undefined;
      const fallbackMsg =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string })?.message) ||
        (error instanceof Error ? error.message : undefined);

      switch (meta?.kind) {
        case "missing-org":
          toast({
            title: "No organization selected",
            description: `Select an organization in the header before you ${action}.`,
            variant: "destructive",
          });
          return;
        case "forbidden":
          toast({
            title: `Not allowed for "${orgLabel}"`,
            description: `You don't have permission to ${action} for the selected organization. Switch organizations in the header or contact a Bouc.io admin.`,
            variant: "destructive",
          });
          return;
        case "not-found":
          toast({
            title: `Not found in "${orgLabel}"`,
            description: `${titleCase(action)} could not be completed because the resource doesn't exist in the selected organization.`,
            variant: "destructive",
          });
          return;
        case "server":
          toast({
            title: `Failed to ${action}`,
            description: `${orgLabel} · ${meta.serverMessage || "Server error, please retry."}`,
            variant: "destructive",
          });
          return;
        case "network":
          toast({
            title: `Failed to ${action}`,
            description: `${orgLabel} · Network error — check your connection and retry.`,
            variant: "destructive",
          });
          return;
        default:
          toast({
            title: `Failed to ${action}`,
            description: `${orgLabel} · ${meta?.serverMessage || fallbackMsg || "Unexpected error."}`,
            variant: "destructive",
          });
      }
    },
    [toast, orgLabel],
  );

  const toastSuccess = useCallback(
    (title: string, description?: string) => {
      toast({
        title,
        description: description ?? `${orgLabel}`,
      });
    },
    [toast, orgLabel],
  );

  return { toastError, toastSuccess, orgLabel };
}
