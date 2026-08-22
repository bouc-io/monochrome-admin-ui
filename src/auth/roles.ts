/** Canonical Keycloak realm role strings. Source of truth: biz_model_usr_access_model.md */
export const ROLES = {
    BOUC_ADMIN:           'bouc_admin',
    BOUC_FINANCE:         'bouc_finance',
    BOUC_OPS:             'bouc_ops',
    BOUC_ENGINEER:        'bouc_engineer',
    BOUC_SRE:             'bouc_sre',
    BOUC_USER:            'bouc_user',
    ORG_ADMIN:            'org_admin',
    ORG_ADMIN_ENTERPRISE: 'org_admin_enterprise',
    ORG_USER:             'org_user',
    PUBLIC_USER:          'public_user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
