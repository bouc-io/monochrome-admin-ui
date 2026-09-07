import { IdentityProvider } from "./types";
import logger from "@/lib/logger";

const log = logger.child("AuthUtils");

export const getEnvVar = (key: string): string => {
  const value = window.ENV?.[key] || import.meta.env[key] || "";

  log.info("Environment variable check:", {
    key,
    hasWindowEnv: !!window.ENV?.[key],
    hasImportMetaEnv: !!import.meta.env[key],
    valueLength: value?.length,
    valuePreview: value
      ? value.length > 50
        ? value.substring(0, 50) + "..."
        : value
      : "not set",
    source: window.ENV?.[key]
      ? "window.ENV"
      : import.meta.env[key]
        ? "import.meta.env"
        : "default",
  });

  return value;
};

export const isValidJWT = (token: string): boolean => {
  log.info("JWT validation check:", {
    hasToken: !!token,
    tokenType: typeof token,
    tokenLength: token?.length,
  });

  if (!token || typeof token !== "string") {
    log.info("Token validation failed: token is empty or not a string");
    return false;
  }

  const parts = token.split(".");
  const isValid = parts.length === 3 && parts.every((part) => part.length > 0);

  log.info("JWT structure analysis:", {
    partsCount: parts.length,
    expectedParts: 3,
    hasValidParts: parts.every((part) => part.length > 0),
    partLengths: parts.map((part) => part.length),
    isValid,
  });

  if (!isValid) {
    log.info(
      "Token validation failed: JWT structure is invalid (should have 3 non-empty parts)",
    );
  } else {
    log.info("Token validation passed: JWT structure is valid");
  }

  return isValid;
};

export const isKeycloakCallback = () => {
  const url = new URL(window.location.href);
  const hasCode = url.searchParams.has("code") || url.searchParams.has("state");
  const hasFragment =
    url.hash.includes("code=") ||
    url.hash.includes("state=") ||
    url.hash.includes("access_token=");

  log.info("Keycloak callback detection:", {
    currentUrl: url.href,
    hasSearchParams: hasCode,
    hasFragment: hasFragment,
    searchParams: {
      hasCode: url.searchParams.has("code"),
      hasState: url.searchParams.has("state"),
      codeValue: url.searchParams.get("code")?.substring(0, 10) + "...",
      stateValue: url.searchParams.get("state")?.substring(0, 10) + "...",
    },
    fragmentAnalysis: {
      fullHash: url.hash,
      hasCodeInHash: url.hash.includes("code="),
      hasStateInHash: url.hash.includes("state="),
      hasAccessTokenInHash: url.hash.includes("access_token="),
    },
    conclusion: hasCode || hasFragment ? "IS_CALLBACK" : "NOT_CALLBACK",
  });

  return hasCode || hasFragment;
};

export const getIdentityProvider = (): IdentityProvider => {
  const provider = getEnvVar("VITE_IDENTITY_PROVIDER").toLowerCase();
  const validProviders = ["keycloak", "auth0", "okta", "stub"];

  log.info("Identity provider selection:", {
    configuredProvider: provider,
    validProviders,
    isValid: validProviders.includes(provider),
    willUseDefault: !validProviders.includes(provider),
  });

  if (validProviders.includes(provider)) {
    log.info(`Using configured identity provider: ${provider}`);
    return provider as IdentityProvider;
  }

  // Default to 'stub' when no valid provider is configured to avoid CORS errors
  // In production, set VITE_IDENTITY_PROVIDER to 'keycloak', 'auth0', or 'okta'
  log.info(
    "Invalid or missing VITE_IDENTITY_PROVIDER, defaulting to stub (use VITE_IDENTITY_PROVIDER=keycloak for production)",
    {
      configured: provider,
      fallback: "stub",
    },
  );

  return "stub";
};
