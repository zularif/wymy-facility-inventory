import { useState, type ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, History, Scale, AlertTriangle, FileText, Tags, ShieldAlert, Users, LogOut, KeyRound } from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const [location] = useLocation();
  const [changePwOpen, setChangePwOpen] = useState(false);

  if (!profile) return <>{children}</>;

  const role = profile.role;

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "storekeeper", "viewer", "technician"] },
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
          <SidebarFooter className="border-t border-sidebar-border p-4 space-y-2">
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{profile.full_name || profile.email}</span>
              <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setChangePwOpen(true)}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-sidebar-accent transition-colors"
                title="Change password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
              <button
                onClick={logout}
                className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-sidebar-accent transition-colors"
                title="Log out"
                data-testid="button-logout"
              >
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

      <ChangePasswordDialog open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </SidebarProvider>
  );
}
