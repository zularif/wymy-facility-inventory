import { useGetDashboardSummary, useGetRecentMovements } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: recentMovements } = useGetRecentMovements({ limit: 5 });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_items}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{summary.low_stock_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock In (This Month)</CardTitle>
              <ArrowDownToLine className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.stock_in_this_month}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Out (This Month)</CardTitle>
              <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.stock_out_this_month}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {recentMovements && recentMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.map(movement => (
                <div key={movement.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {movement.movement_type === "IN" ? (
                      <div className="p-2 bg-green-100 text-green-700 rounded-full"><ArrowDownToLine className="w-4 h-4" /></div>
                    ) : (
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-full"><ArrowUpFromLine className="w-4 h-4" /></div>
                    )}
                    <div>
                      <p className="font-medium">{movement.item_name} <span className="text-muted-foreground text-sm">({movement.item_code})</span></p>
                      <p className="text-sm text-muted-foreground">{new Date(movement.movement_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${movement.movement_type === "IN" ? "text-green-600" : "text-blue-600"}`}>
                      {movement.movement_type === "IN" ? "+" : "-"}{movement.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{movement.created_by}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
