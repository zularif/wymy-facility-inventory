import {
  useGetDashboardSummary,
  useGetDashboardLowStock,
  useGetDashboardTopStockOut,
  useGetDashboardMonthlyTrend,
  type ItemWithStock,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingDown,
  XCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function KpiCard({
  title,
  value,
  icon,
  colorClass,
  sub,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colorClass.replace("bg-", "text-").replace("/10", "")}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function exportAlertCsv(items: ItemWithStock[] | undefined) {
  if (!items) return;
  const header = ["Item ID", "Item Name", "Category", "Location", "Current Stock", "Min Order", "Status"];
  const rows = items.map((i) => [
    i.item_code,
    `"${i.item_name}"`,
    i.category ?? "",
    i.location ?? "",
    i.current_stock,
    i.minimum_order ?? 0,
    i.current_stock === 0 ? "Zero Stock" : "Low Stock",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock-alert-items.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function SkeletonCard() {
  return <div className="h-28 bg-muted rounded-lg animate-pulse" />;
}

export function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: alertItems, isLoading: alertLoading } = useGetDashboardLowStock();
  const { data: topOut, isLoading: topLoading } = useGetDashboardTopStockOut();
  const { data: trend, isLoading: trendLoading } = useGetDashboardMonthlyTrend();

  const lowStockCount = summary?.low_stock_count ?? 0;
  const zeroStockCount = summary?.out_of_stock_count ?? 0;
  const alertCount = lowStockCount + zeroStockCount;

  const chartData = (trend ?? []).map((t) => ({
    month: t.month.slice(5),
    "Stock In": t.stock_in,
    "Stock Out": t.stock_out,
  }));

  const topOutData = (topOut ?? []).map((t, i) => ({
    name: t.item_name.length > 22 ? t.item_name.slice(0, 22) + "…" : t.item_name,
    fullName: t.item_name,
    qty: t.total_out,
    rank: i + 1,
    category: t.category ?? "—",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {sumLoading ? (
          Array.from<number>({ length: 6 }).map((_v, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title="Total Items"
              value={summary?.total_items ?? 0}
              icon={<Package className="w-4 h-4 text-blue-600" />}
              colorClass="bg-blue-500/10"
              sub="Active items"
            />
            <KpiCard
              title="Stock Alert"
              value={alertCount}
              icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
              colorClass="bg-red-500/10"
              sub={`${lowStockCount} low · ${zeroStockCount} zero`}
            />
            <KpiCard
              title="Low Stock"
              value={lowStockCount}
              icon={<TrendingDown className="w-4 h-4 text-orange-600" />}
              colorClass="bg-orange-500/10"
              sub="Below min level"
            />
            <KpiCard
              title="Zero Stock"
              value={zeroStockCount}
              icon={<XCircle className="w-4 h-4 text-red-600" />}
              colorClass="bg-red-500/10"
              sub="Out of stock"
            />
            <KpiCard
              title="Stock In (Month)"
              value={summary?.stock_in_this_month ?? 0}
              icon={<ArrowDownToLine className="w-4 h-4 text-emerald-600" />}
              colorClass="bg-emerald-500/10"
              sub="This month"
            />
            <KpiCard
              title="Stock Out (Month)"
              value={summary?.stock_out_this_month ?? 0}
              icon={<ArrowUpFromLine className="w-4 h-4 text-purple-600" />}
              colorClass="bg-purple-500/10"
              sub="This month"
            />
          </>
        )}
      </div>

      {/* Middle row: Alert table + Top Stock Out */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alert Items */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-base">Stock Alert Items</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => exportAlertCsv(alertItems)}
                disabled={!alertItems?.length}
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
              <Link href="/items?status=active">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <ExternalLink className="w-3 h-3" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {alertLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
              </div>
            ) : !alertItems?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <AlertTriangle className="w-8 h-8 opacity-30" />
                <span className="text-sm">No stock alerts</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item ID</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Stock</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Min Ord</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alertItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{item.item_code}</td>
                      <td className="px-4 py-2 font-medium max-w-[140px] truncate">{item.item_name}</td>
                      <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{item.category ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">{item.location ?? "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold">{item.current_stock}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground hidden sm:table-cell">{item.minimum_order ?? 0}</td>
                      <td className="px-4 py-2 text-center">
                        {item.current_stock === 0 ? (
                          <Badge variant="destructive" className="text-xs">Zero Stock</Badge>
                        ) : (
                          <Badge className="text-xs bg-orange-500 hover:bg-orange-600">Low Stock</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Top Stock Out Items */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Stock Out Items (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {topLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : !topOutData.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <ArrowUpFromLine className="w-8 h-8 opacity-30" />
                <span className="text-sm">No stock out data</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[...topOutData].reverse()}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(val: number, _name: string, props) => [val, props.payload.fullName]}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="qty" fill="hsl(271 81% 55%)" radius={[0, 4, 4, 0]} name="Total Out" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock In vs Stock Out — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-56 bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Stock In" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stock Out" fill="hsl(271 81% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
