import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { adminApiClient, setActiveOrgIdRef } from "@/lib/api";
import { useRoles, ROLES } from "@/auth/useRoles";

export interface OrgScopeOption {
  id: string;
  name: string;
  group: "internal" | "customers";
  synthetic?: boolean;
}

interface OrgScopeContextValue {
  activeOrgId: string | null;
  activeOrg: OrgScopeOption | null;
  availableOrgs: OrgScopeOption[];
  setActiveOrgId: (id: string) => void;
  isPinned: boolean;
  isLoading: boolean;
  canSwitch: boolean;
}

const OrgScopeContext = createContext<OrgScopeContextValue | undefined>(undefined);

const STORAGE_KEY = "bouc.activeOrgId";

// Use the deterministic UUIDs seeded in GAP 2 so X-Active-Org header matches DB org_id values.
const SYNTHETIC_ORGS: OrgScopeOption[] = [
  { id: "a0000000-0000-4000-8000-000000000001", name: "Bouc.io", group: "internal", synthetic: true },
  { id: "a0000000-0000-4000-8000-000000000002", name: "Public (free users)", group: "internal", synthetic: true },
];

const BOUC_STAFF_ROLES = [
  ROLES.BOUC_ADMIN,
  ROLES.BOUC_SRE,
  ROLES.BOUC_ENGINEER,
] as const;

export function OrgScopeProvider({ children }: { children: ReactNode }) {
  const { hasAnyRole, hasRole, orgId: jwtOrgId } = useRoles();
  const isBoucStaff = hasAnyRole(...BOUC_STAFF_ROLES);
  const isOrgAdmin = hasRole(ROLES.ORG_ADMIN) || hasRole(ROLES.ORG_ADMIN_ENTERPRISE);

  const [customerOrgs, setCustomerOrgs] = useState<OrgScopeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [ownOrgName, setOwnOrgName] = useState<string | null>(null);

  // Load orgs based on role
  useEffect(() => {
    let cancelled = false;
    if (isBoucStaff) {
      setIsLoading(true);
      adminApiClient
        .get("/v1/admin/organizations")
        .then((res) => {
          if (cancelled) return;
          const orgs = (res.data.organizations as Array<Record<string, unknown>>).map((o) => ({
            id: o.id as string,
            name: o.name as string,
            group: "customers" as const,
          }));
          setCustomerOrgs(orgs);
        })
        .catch(() => {
          if (!cancelled) setCustomerOrgs([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    } else if (isOrgAdmin && jwtOrgId) {
      // Resolve the real name of the org admin's own org so the pinned
      // switcher badge doesn't show the bare UUID.
      adminApiClient
        .get(`/v1/admin/organizations/${jwtOrgId}`)
        .then((res) => {
          if (cancelled) return;
          const name = (res.data as { name?: string })?.name;
          setOwnOrgName(typeof name === "string" && name.length > 0 ? name : "Your Organization");
        })
        .catch(() => {
          if (!cancelled) setOwnOrgName("Your Organization");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isBoucStaff, isOrgAdmin, jwtOrgId]);

  const availableOrgs = useMemo<OrgScopeOption[]>(() => {
    if (isBoucStaff) return [...SYNTHETIC_ORGS, ...customerOrgs];
    if (isOrgAdmin && jwtOrgId) {
      return [{ id: jwtOrgId, name: ownOrgName ?? "Your Organization", group: "customers" }];
    }
    return [];
  }, [isBoucStaff, isOrgAdmin, jwtOrgId, customerOrgs, ownOrgName]);

  // Initialize active org
  useEffect(() => {
    if (activeOrgId) return;
    if (isOrgAdmin && jwtOrgId) {
      setActiveOrgIdState(jwtOrgId);
      return;
    }
    if (isBoucStaff) {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const all = [...SYNTHETIC_ORGS, ...customerOrgs];
      const valid = stored && all.some((o) => o.id === stored) ? stored : SYNTHETIC_ORGS[0].id;
      setActiveOrgIdState(valid);
    }
  }, [isBoucStaff, isOrgAdmin, jwtOrgId, customerOrgs, activeOrgId]);

  // Sync to API holder
  useEffect(() => {
    setActiveOrgIdRef(activeOrgId);
  }, [activeOrgId]);

  const setActiveOrgId = useCallback(
    (id: string) => {
      setActiveOrgIdState(id);
      if (isBoucStaff && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [isBoucStaff]
  );

  const activeOrg = useMemo(
    () => availableOrgs.find((o) => o.id === activeOrgId) ?? null,
    [availableOrgs, activeOrgId]
  );

  const value: OrgScopeContextValue = {
    activeOrgId,
    activeOrg,
    availableOrgs,
    setActiveOrgId,
    isPinned: !isBoucStaff && isOrgAdmin,
    canSwitch: isBoucStaff,
    isLoading,
  };

  return <OrgScopeContext.Provider value={value}>{children}</OrgScopeContext.Provider>;
}

export function useOrgScope() {
  const ctx = useContext(OrgScopeContext);
  if (!ctx) throw new Error("useOrgScope must be used within OrgScopeProvider");
  return ctx;
}
