import { useState, useEffect, useCallback } from "react";
import { adminApiClient } from "./api";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  maxSeats: number;
  monthlySpend: number;
  ssoConfig: object | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface OrganizationDetail extends Organization {
  members: Member[];
}

export interface Member {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  tier: string;
  status?: string;
  sso_config?: object | null;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  tier?: string;
  status?: string;
  sso_config?: object | null;
}

export interface AddMemberRequest {
  user_id?: string;
  email?: string;
  role?: string;
}

function mapOrg(raw: Record<string, unknown>): Organization {
  const count = raw._count as { members: number } | undefined;
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    tier: raw.tier as string,
    status: raw.status as string,
    maxSeats: raw.max_seats as number,
    monthlySpend: raw.monthly_spend as number,
    ssoConfig: raw.sso_config as object | null,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    memberCount: count?.members ?? 0,
  };
}

function mapMember(raw: Record<string, unknown>): Member {
  return {
    id: raw.id as string,
    orgId: raw.org_id as string,
    userId: raw.user_id as string,
    role: raw.role as string,
    joinedAt: raw.joined_at as string,
  };
}

export function useOrganizationsApi() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiClient.get("/v1/admin/organizations");
      setOrganizations(res.data.organizations.map(mapOrg));
    } catch (err) {
      console.error("Failed to load organizations", err);
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const fetchOrganization = useCallback(async (id: string): Promise<OrganizationDetail> => {
    const res = await adminApiClient.get(`/v1/admin/organizations/${id}`);
    const raw = res.data as Record<string, unknown>;
    const members = (raw.members as Record<string, unknown>[]).map(mapMember);
    return { ...mapOrg(raw), members };
  }, []);

  const createOrganization = useCallback(async (data: CreateOrganizationRequest): Promise<Organization> => {
    const res = await adminApiClient.post("/v1/admin/organizations", data);
    const created = mapOrg(res.data);
    setOrganizations((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateOrganization = useCallback(async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const res = await adminApiClient.put(`/v1/admin/organizations/${id}`, data);
    const updated = mapOrg(res.data);
    setOrganizations((prev) => prev.map((o) => (o.id === id ? { ...updated, memberCount: o.memberCount } : o)));
    return updated;
  }, []);

  const deleteOrganization = useCallback(async (id: string): Promise<void> => {
    await adminApiClient.delete(`/v1/admin/organizations/${id}`);
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const fetchMembers = useCallback(async (orgId: string): Promise<Member[]> => {
    const res = await adminApiClient.get(`/v1/admin/organizations/${orgId}/members`);
    return (res.data.members as Record<string, unknown>[]).map(mapMember);
  }, []);

  const addMember = useCallback(async (orgId: string, data: AddMemberRequest): Promise<Member> => {
    const res = await adminApiClient.post(`/v1/admin/organizations/${orgId}/members`, data);
    const member = mapMember(res.data);
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, memberCount: o.memberCount + 1 } : o))
    );
    return member;
  }, []);

  const updateMemberRole = useCallback(async (orgId: string, memberId: string, role: string): Promise<Member> => {
    const res = await adminApiClient.put(`/v1/admin/organizations/${orgId}/members/${memberId}`, { role });
    return mapMember(res.data);
  }, []);

  const removeMember = useCallback(async (orgId: string, memberId: string): Promise<void> => {
    await adminApiClient.delete(`/v1/admin/organizations/${orgId}/members/${memberId}`);
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, memberCount: Math.max(0, o.memberCount - 1) } : o))
    );
  }, []);

  return {
    organizations,
    loading,
    error,
    fetchOrganizations,
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    fetchMembers,
    addMember,
    updateMemberRole,
    removeMember,
  };
}
