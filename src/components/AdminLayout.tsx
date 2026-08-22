import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { NavigationDropdown } from "./NavigationDropdown";
import { OrgScopeProvider } from "@/context/OrgScopeContext";
import { OrgSwitcher } from "./OrgSwitcher";

export function AdminLayout() {
  return (
    <OrgScopeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-background sticky top-0 z-10">
              <SidebarTrigger className="shrink-0" />
              <div className="flex-1" />
              <OrgSwitcher />
              <NavigationDropdown />
            </header>
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </OrgScopeProvider>
  );
}
