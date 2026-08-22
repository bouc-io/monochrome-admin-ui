import { useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from './authcontext';
import { ROLES, type Role } from './roles';

interface JwtPayload {
    realm_access?: { roles?: string[] };
    org_id?: string;
    [key: string]: unknown;
}

/**
 * Hook that reads Keycloak realm roles from the access token.
 * Reading directly from authTokens.access is adapter-independent and
 * always up-to-date after a token refresh.
 */
export function useRoles() {
    const { authTokens } = useAuth();

    const { roles, orgId } = useMemo<{ roles: string[]; orgId: string | null }>(() => {
        if (!authTokens?.access) return { roles: [], orgId: null };
        try {
            const decoded = jwtDecode<JwtPayload>(authTokens.access);
            return {
                roles: decoded.realm_access?.roles ?? [],
                orgId: decoded.org_id ?? null,
            };
        } catch {
            return { roles: [], orgId: null };
        }
    }, [authTokens?.access]);

    const hasRole = (role: Role): boolean => roles.includes(role);

    const hasAnyRole = (...allowedRoles: Role[]): boolean =>
        allowedRoles.some((r) => roles.includes(r));

    return { roles, orgId, hasRole, hasAnyRole };
}

export { ROLES };
