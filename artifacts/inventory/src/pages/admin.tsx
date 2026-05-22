import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "@/pages/users";
import { AuditLog } from "@/pages/audit";
import { useListCategories, useListLocations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, ShieldAlert, FolderOpen, MapPin, Settings } from "lucide-react";
import { useSearch } from "wouter";

export function Admin() {
  const raw = useSearch();
  const params = new URLSearchParams(raw);
  const defaultTab = params.get("tab") ?? "users";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin</h1>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="gap-2">
            <UsersIcon className="w-4 h-4" /> User Management
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen className="w-4 h-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="w-4 h-4" /> Locations
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> System Settings
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="users"><Users /></TabsContent>
          <TabsContent value="audit"><AuditLog /></TabsContent>
          <TabsContent value="categories"><CategoriesPanel /></TabsContent>
          <TabsContent value="locations"><LocationsPanel /></TabsContent>
          <TabsContent value="settings"><SettingsPanel /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function CategoriesPanel() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Badge variant="secondary">{categories?.length ?? 0} total</Badge>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Categories are derived automatically from the Item Master. To add or rename a category, edit the item's category field.
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).sort().map(cat => (
                <Badge key={cat} variant="outline" className="text-sm py-1 px-3">
                  <FolderOpen className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  {cat}
                </Badge>
              ))}
              {!categories?.length && (
                <p className="text-sm text-muted-foreground">No categories found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LocationsPanel() {
  const { data: locations, isLoading } = useListLocations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Locations</h2>
        <Badge variant="secondary">{locations?.length ?? 0} total</Badge>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Locations are derived automatically from the Item Master. To add or rename a location, edit the item's location/rack field.
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(locations ?? []).sort().map(loc => (
                <Badge key={loc} variant="outline" className="text-sm py-1 px-3">
                  <MapPin className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  {loc}
                </Badge>
              ))}
              {!locations?.length && (
                <p className="text-sm text-muted-foreground">No locations found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">System Settings</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">System Name</p>
                <p className="text-sm text-muted-foreground">WYMY Facility Inventory System</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Database</p>
                <p className="text-sm text-muted-foreground">PostgreSQL — connected</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Online</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Session Authentication</p>
                <p className="text-sm text-muted-foreground">Session-based (bcrypt + pg-session)</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Version</p>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
