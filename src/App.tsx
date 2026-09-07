import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/authcontext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import { ROLES } from "@/auth/roles";
import Dashboard from "./pages/Dashboard";
import SSOConfig from "./pages/SSOConfig";
import SystemStatus from "./pages/SystemStatus";
import LLMInstructions from "./pages/LLMInstructions";
import LLMProviders from "./pages/LLMProviders";
import LLMAssignments from "./pages/LLMAssignments";
import MCPServers from "./pages/MCPServers";
import Organizations from "./pages/Organizations";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_ENGINEER,
                            ROLES.BOUC_SRE,
                            ROLES.ORG_ADMIN,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <AdminLayout />
                        </RoleProtectedRoute>
                      </ProtectedRoute>
                    }
                  >
                    {/* Dashboard: visible to all admin-portal-capable roles */}
                    <Route path="/" element={<Dashboard />} />

                    <Route
                      path="/sso"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.ORG_ADMIN,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <SSOConfig />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/system"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_SRE,
                            ROLES.BOUC_ENGINEER,
                            ROLES.ORG_ADMIN,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <SystemStatus />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/instructions"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_ENGINEER,
                            ROLES.ORG_ADMIN,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <LLMInstructions />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/llm-providers"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_SRE,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <LLMProviders />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/llm-assignments"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_ENGINEER,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <LLMAssignments />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/mcp-servers"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.BOUC_SRE,
                            ROLES.BOUC_ENGINEER,
                          ]}
                        >
                          <MCPServers />
                        </RoleProtectedRoute>
                      }
                    />

                    <Route
                      path="/organizations"
                      element={
                        <RoleProtectedRoute
                          allowedRoles={[
                            ROLES.BOUC_ADMIN,
                            ROLES.ORG_ADMIN,
                            ROLES.ORG_ADMIN_ENTERPRISE,
                          ]}
                        >
                          <Organizations />
                        </RoleProtectedRoute>
                      }
                    />

                    {/* Settings: all authenticated users */}
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
