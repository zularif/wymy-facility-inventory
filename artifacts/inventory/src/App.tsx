import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";

import { SignIn } from "@/pages/sign-in";
import { Dashboard } from "@/pages/dashboard";
import { ItemsPage } from "@/pages/items";
import { ItemForm } from "@/pages/items/form";
import { StockIn } from "@/pages/stock-in";
import { StockOut } from "@/pages/stock-out";
import { Movements } from "@/pages/movements";
import { Balance } from "@/pages/balance";
import { LowStock } from "@/pages/low-stock";
import { Reports } from "@/pages/reports";
import { Labels } from "@/pages/labels";
import { AuditLog } from "@/pages/audit";
import { Users } from "@/pages/users";
import { Admin } from "@/pages/admin";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    const dest = encodeURIComponent(window.location.pathname + window.location.search);
    return <Redirect to={`/sign-in?redirect=${dest}`} />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function HomeRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (profile) return <Redirect to="/dashboard" />;
  return <Redirect to="/sign-in" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in" component={SignIn} />
      <Route path="/" component={HomeRedirect} />

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} roles={["admin", "storekeeper", "viewer", "technician"]} />}
      </Route>

      <Route path="/items/new">
        {() => <ProtectedRoute component={ItemForm} roles={["admin", "storekeeper"]} />}
      </Route>

      <Route path="/items/:id/edit">
        {() => <ProtectedRoute component={ItemForm} roles={["admin", "storekeeper"]} />}
      </Route>

      <Route path="/items">
        {() => <ProtectedRoute component={ItemsPage} roles={["admin", "storekeeper", "viewer", "technician"]} />}
      </Route>

      <Route path="/stock-in">
        {() => <ProtectedRoute component={StockIn} roles={["admin", "storekeeper"]} />}
      </Route>

      <Route path="/stock-out">
        {() => <ProtectedRoute component={StockOut} roles={["admin", "storekeeper", "technician"]} />}
      </Route>

      {/* Legacy routes — still accessible via direct URL */}
      <Route path="/movements">
        {() => <ProtectedRoute component={Movements} roles={["admin", "storekeeper", "viewer", "technician"]} />}
      </Route>

      <Route path="/balance">
        {() => <ProtectedRoute component={Balance} roles={["admin", "storekeeper", "viewer"]} />}
      </Route>

      <Route path="/low-stock">
        {() => <ProtectedRoute component={LowStock} roles={["admin", "storekeeper"]} />}
      </Route>

      <Route path="/audit">
        {() => <ProtectedRoute component={AuditLog} roles={["admin"]} />}
      </Route>

      <Route path="/users">
        {() => <ProtectedRoute component={Users} roles={["admin"]} />}
      </Route>

      {/* Main nav routes */}
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} roles={["admin", "storekeeper", "viewer"]} />}
      </Route>

      <Route path="/labels">
        {() => <ProtectedRoute component={Labels} roles={["admin", "storekeeper", "technician"]} />}
      </Route>

      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} roles={["admin"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
