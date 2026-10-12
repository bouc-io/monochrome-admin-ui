import axiosInstance, { adminApiClient } from "./api";
import logger from "@/lib/logger";

const log = logger.child("TokenInterceptors");

const setup = (store) => {
  log.info("Token Interceptors: Setting up interceptors:", {
    hasStore: !!store,
    storeAuthenticated: store?.authenticated,
    hasTokens: !!store?.authTokens,
    hasAccessToken: !!store?.authTokens?.access,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      const currentStore = window.__AUTH_STORE__ || store;
      log.info("Request Interceptor: Processing request:", {
        url: config.url,
        method: config.method,
        hasStore: !!currentStore,
        authenticated: currentStore?.authenticated,
        hasAccessToken: !!currentStore?.authTokens?.access,
        accessTokenLength: currentStore?.authTokens?.access?.length,
      });

      // If user is authenticated, place access token in request headers
      if (currentStore.authenticated && currentStore.authTokens?.access) {
        const token = currentStore.authTokens.access;
        config.headers["x-auth-request-access-token"] = token;
        config.headers["Authorization"] = `Bearer ${token}`;

        log.info("Request Interceptor: Token added to headers:", {
          url: config.url,
          hasXAuthToken: !!config.headers["x-auth-request-access-token"],
          hasAuthHeader: !!config.headers["Authorization"],
          tokenPreview: token.substring(0, 20) + "...",
        });
      } else {
        log.info(
          "Request Interceptor: No token added - user not authenticated:",
          {
            url: config.url,
            authenticated: currentStore?.authenticated,
            hasTokens: !!currentStore?.authTokens,
            hasAccessToken: !!currentStore?.authTokens?.access,
          },
        );
      }

      return config;
    },
    (error) => {
      log.error("Request Interceptor Error:", {
        error,
        message: error?.message,
        config: error?.config?.url,
      });
      return Promise.reject(error);
    },
  );

  axiosInstance.interceptors.response.use(
    (res) => {
      log.info("Response Interceptor: Success response:", {
        status: res.status,
        url: res.config?.url,
        method: res.config?.method,
      });
      return res;
    },
    async (error) => {
      const oriConfig = error.config;
      const status = error.response?.status;

      log.info("Response Interceptor: Error response:", {
        status,
        url: oriConfig?.url,
        method: oriConfig?.method,
        isRetry: !!oriConfig?._retry,
        hasRefreshFunction: !!store?.refreshUserToken,
        errorMessage: error?.message,
      });

      if (status === 401 && !oriConfig._retry) {
        log.info(
          "Response Interceptor: 401 detected, attempting token refresh",
        );
        oriConfig._retry = true;

        try {
          // Refresh token then retry once
          log.info("Response Interceptor: Calling refresh token function");
          const newTokens = await store.refreshUserToken();

          log.info("Response Interceptor: Token refresh result:", {
            hasNewTokens: !!newTokens,
            hasAccessToken: !!newTokens?.access,
            newTokenLength: newTokens?.access?.length,
            originalUrl: oriConfig.url,
          });

          if (newTokens?.access) {
            // Place refreshed access token in the request headers
            oriConfig.headers["x-auth-request-access-token"] = newTokens.access;
            oriConfig.headers["Authorization"] = `Bearer ${newTokens.access}`;

            log.info("Response Interceptor: Retrying request with new token:", {
              url: oriConfig.url,
              newTokenPreview: newTokens.access.substring(0, 20) + "...",
            });
          }

          return axiosInstance(oriConfig);
        } catch (_error) {
          log.error("Response Interceptor: Refresh token failed:", {
            error: _error,
            message: _error?.message,
            originalUrl: oriConfig?.url,
            willLogout: true,
          });

          return Promise.reject(_error);
        }
      }

      log.info("Response Interceptor: Request failed (no retry):", {
        status,
        url: oriConfig?.url,
        reason: status === 401 ? "Already retried" : "Non-401 error",
        willReject: true,
      });

      return Promise.reject(error);
    },
  );

  // Attach Bearer token to admin API requests (same pattern, no refresh needed)
  adminApiClient.interceptors.request.use(
    (config) => {
      const currentStore = window.__AUTH_STORE__ || store;
      if (currentStore.authenticated && currentStore.authTokens?.access) {
        const token = currentStore.authTokens.access;
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  log.info("Token Interceptors: Setup completed");
};

export default setup;
