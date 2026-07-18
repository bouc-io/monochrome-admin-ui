import { LayoutDashboard, Shield, Activity, FileText, Settings, LogOut, Plug, SlidersHorizontal, Building2, Server } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/authcontext";
import { useRoles, ROLES } from "@/auth/useRoles";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logoutUser, user } = useAuth();
  const { hasAnyRole } = useRoles();

  const navItems = [
    { title: "Dashboard",           url: "/",               icon: LayoutDashboard,    visible: true },
    { title: "SSO Configuration",   url: "/sso",            icon: Shield,             visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.ORG_ADMIN, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "System Status",       url: "/system",         icon: Activity,           visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_SRE, ROLES.BOUC_ENGINEER, ROLES.ORG_ADMIN, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "LLM Instructions",    url: "/instructions",   icon: FileText,           visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_ENGINEER, ROLES.ORG_ADMIN, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "LLM Providers",       url: "/llm-providers",  icon: Plug,               visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_SRE, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "Tool LLM Assignment", url: "/llm-assignments",icon: SlidersHorizontal,  visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_ENGINEER, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "MCP Servers",         url: "/mcp-servers",    icon: Server,             visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_SRE, ROLES.BOUC_ENGINEER) },
    { title: "Organizations",       url: "/organizations",  icon: Building2,          visible: hasAnyRole(ROLES.BOUC_ADMIN, ROLES.ORG_ADMIN, ROLES.ORG_ADMIN_ENTERPRISE) },
    { title: "Settings",            url: "/settings",       icon: Settings,           visible: true },
  ].filter(item => item.visible);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const userEmail = (user?.email || user?.preferred_username || "Admin") as string;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shrink-0">
            <img src="/boucio-logo.png" alt="Logo" className="object-cover h-full w-full" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              Admin Console
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-1">{userEmail}</p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={logoutUser}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
