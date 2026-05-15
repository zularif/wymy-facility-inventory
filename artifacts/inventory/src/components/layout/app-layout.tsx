import { ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, History, Scale, AlertTriangle, FileText, Tags, ShieldAlert, Users, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const [location] = useLocation();

  if (!profile) return <>{children}</>;

  const role = profile.role;

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "storekeeper", "viewer"] },
    { href: "/items", label: "Item Master", icon: Package, roles: ["admin", "storekeeper"] },
    { href: "/stock-in", label: "Stock In", icon: ArrowDownToLine, roles: ["admin", "storekeeper"] },
    { href: "/stock-out", label: "Stock Out", icon: ArrowUpFromLine, roles: ["admin", "storekeeper", "technician"] },
    { href: "/movements", label: "Movements", icon: History, roles: ["admin", "storekeeper", "technician"] },
    { href: "/balance", label: "Stock Balance", icon: Scale, roles: ["admin", "storekeeper", "viewer"] },
    { href: "/low-stock", label: "Low Stock", icon: AlertTriangle, roles: ["admin", "storekeeper"] },
    { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "storekeeper", "viewer"] },
    { href: "/labels", label: "Rack Labels", icon: Tags, roles: ["admin", "storekeeper"] },
    { href: "/audit", label: "Audit Log", icon: ShieldAlert, roles: ["admin"] },
    { href: "/users", label: "Users", icon: Users, roles: ["admin"] },
  ].filter(link => link.roles.includes(role));

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50/50">
        <Sidebar>
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="font-bold text-lg tracking-tight">Inventory OS</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.startsWith(link.href);
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={link.label}>
                      <Link href={link.href} className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate">{profile.full_name || profile.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
              </div>
              <button onClick={logout} className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-sidebar-accent transition-colors" title="Log out" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
