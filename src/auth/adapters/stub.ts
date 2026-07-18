
import { jwtDecode } from "jwt-decode";
import { getEnvVar, isValidJWT } from "../authUtils";
import { AuthTokens, User } from '../types';
import { Identity, IdentityProvider } from './types';
import { authStore } from '@/lib/authStore';
import logger from '@/lib/logger';

const log = logger.child('StubAdapter');

class StubIdentityProvider implements IdentityProvider {
    private authTokens: AuthTokens = null;
    private user: User = null;
    private loading: boolean = true;

    async init(): Promise<void> {
        log.info('Stub auth mode: Setting tokens from .env or using mock tokens');

        const accessToken = getEnvVar('VITE_ACCESS_TOKEN');
        const refreshToken = getEnvVar('VITE_REFRESH_TOKEN');

        log.info('StubAdapter: Environment tokens check:', {
            hasAccessToken: !!accessToken,
            accessTokenLength: accessToken?.length,
            isDefaultValue: accessToken === 'your-access-token-here',
            hasRefreshToken: !!refreshToken,
            refreshTokenLength: refreshToken?.length
        });

        if (accessToken && accessToken !== 'your-access-token-here' && isValidJWT(accessToken)) {
            log.info('StubAdapter: Attempting to use real tokens from environment');
            
            try {
                const tokens = { access: accessToken, refresh: refreshToken };
                const decodedUser = jwtDecode(accessToken);

                log.info('StubAdapter: JWT decode successful:', {
                    decodedKeys: Object.keys(decodedUser),
                    hasSub: !!(decodedUser as any).sub,
                    hasExp: !!(decodedUser as any).exp,
                    tokenType: typeof decodedUser
                });

                this.authTokens = tokens;
                this.user = { 
                    ...(decodedUser as any), 
                    identityProvider: 'stub' 
                };
                
                log.info('StubAdapter: Real user created from JWT:', {
                    userKeys: Object.keys(this.user),
                    hasSub: !!this.user.sub,
                    hasEmail: !!this.user.email,
                    provider: this.user.identityProvider
                });
                
                // Use auth store instead of localStorage
                await authStore.initOauth(this.user, tokens);

                log.info('Stub auth mode: Real tokens loaded from .env');
                this.loading = false;
                return;
            } catch (error) {
                log.error('Failed to decode .env tokens:', {
                    error,
                    message: error?.message,
                    tokenPreview: accessToken?.substring(0, 20) + '...',
                    fallbackToMock: true
                });
            }
        } else {
            log.info('StubAdapter: No valid tokens in environment, using fallback', {
                hasToken: !!accessToken,
                isDefault: accessToken === 'your-access-token-here',
                isValidJWT: accessToken ? isValidJWT(accessToken) : false
            });
        }

        // Fallback to mock tokens
        await this.setFallbackTokens();
        this.loading = false;
    }

    private async setFallbackTokens(): Promise<void> {
        log.info('StubAdapter: Setting up fallback mock tokens (full-access Bouc admin simulation)');

        // Build a structurally-valid JWT so useRoles + jwtDecode work identically to real auth.
        // This grants the dev user all admin roles + an org_id, simulating full access.
        const stubPayload = {
            sub: 'stub-user',
            preferred_username: 'developer',
            email: 'dev@example.com',
            name: 'Development User (Stub)',
            org_id: 'bouc-internal',
            realm_access: {
                roles: [
                    'bouc_admin',
                    'bouc_engineer',
                    'bouc_sre',
                    'org_admin',
                    'org_admin_enterprise',
                ],
            },
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        };

        const b64url = (obj: object) =>
            btoa(JSON.stringify(obj))
                .replace(/=+$/, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');

        const accessToken = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(stubPayload)}.stub-signature`;

        const mockTokens = {
            access: accessToken,
            refresh: accessToken,
        };

        this.authTokens = mockTokens;
        this.user = {
            ...stubPayload,
            identityProvider: 'stub',
        };
        
        log.info('StubAdapter: Mock user created:', {
            sub: this.user.sub,
            username: this.user.preferred_username,
            email: this.user.email,
            provider: this.user.identityProvider
        });
        
        log.info('StubAdapter: Initializing auth store with mock tokens');
        
        // Use auth store instead of localStorage
        await authStore.initOauth(this.user, mockTokens);
        
        log.info('StubAdapter: Fallback tokens initialized successfully');
    }

    async getIdentity(): Promise<Identity> {
        log.info('StubAdapter: Getting identity:', {
            hasUser: !!this.user,
            hasTokens: !!this.authTokens,
            loading: this.loading
        });

        return {
            user: this.user,
            authTokens: this.authTokens,
            loading: this.loading,
            login: async () => {
                log.info('Login skipped due to stub identity provider', {
                    currentUser: this.user?.preferred_username,
                    hasTokens: !!this.authTokens
                });
            },
            logoutUser: () => {
                log.info('Logging out from stub', {
                    wasAuthenticated: !!this.user,
                    hadTokens: !!this.authTokens
                });
                
                this.authTokens = null;
                this.user = null;
                // Use auth store instead of localStorage
                authStore.clearUserData();
                
                log.info('StubAdapter: Logout completed');
            },
            refreshToken: async () => {
                log.info('Token refresh skipped due to stub identity provider - returning existing tokens', {
                    hasExistingTokens: !!this.authTokens,
                    tokenType: 'mock'
                });
                return this.authTokens;
            }
        };
    }
}

export const StubAdapter = new StubIdentityProvider();
