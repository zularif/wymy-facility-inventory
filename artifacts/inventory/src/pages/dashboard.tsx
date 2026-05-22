import {
  useGetDashboardSummary,
  useGetDashboardLowStock,
  useGetDashboardTopStockOut,
  useGetDashboardMonthlyTrend,
  useGetRecentMovements,
  type ItemWithStock,
  type DashboardSummary,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  Download, ExternalLink,
  Zap, Bookmark,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";

/* ─── helpers ─────────────────────────────────────────────── */

function exportAlertCsv(items: ItemWithStock[] | undefined) {
  if (!items?.length) return;
  const header = ["Item ID", "Item Name", "Category", "Location", "Current Stock", "Min Order", "Status"];
  const rows = items.map(i => [
    i.item_code, `"${i.item_name}"`, i.category ?? "", i.location ?? "",
    i.current_stock, i.minimum_order ?? 0,
    i.current_stock === 0 ? "Zero Stock" : "Low Stock",
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: "stock-alert-items.csv",
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function KpiCard({ title, value, icon, bg, sub }: { title: string; value: number | string; icon: React.ReactNode; bg: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <div className={`p-1.5 rounded-md ${bg}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Skeleton({ h = "h-5" }: { h?: string }) {
  return <div className={`${h} bg-muted animate-pulse rounded`} />;
}

/* ─── right panel sections ────────────────────────────────── */

function QuickActions({ role }: { role: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(role === "admin" || role === "storekeeper") && (
          <Link href="/stock-in">
            <Button className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white h-9">
              <ArrowDownToLine className="w-4 h-4" /> New Stock In
            </Button>
          </Link>
        )}
        <Link href="/stock-out">
          <Button className="w-full justify-start gap-2 bg-orange-500 hover:bg-orange-600 text-white h-9">
            <ArrowUpFromLine className="w-4 h-4" /> New Stock Out
          </Button>
        </Link>
        {(role === "admin" || role === "storekeeper") && (
          <Link href="/items/new">
            <Button className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9">
              <Package className="w-4 h-4" /> Add New Item
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function StockSummary({ summary }: { summary: DashboardSummary | undefined }) {
  const rows = [
    { label: "Total Items",      value: summary?.total_items ?? "—",       color: "text-blue-600" },
    { label: "Total Stock",      value: summary?.total_stock ?? "—",       color: "text-emerald-600" },
    { label: "Total Locations",  value: summary?.total_locations ?? "—",   color: "text-violet-600" },
    { label: "Total Categories", value: summary?.total_categories ?? "—",  color: "text-orange-600" },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" />Stock Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className={`font-bold text-lg ${r.color}`}>{r.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


function Shortcuts({ summary }: { summary: DashboardSummary | undefined }) {
  const items = [
    { label: "Low Stock",       value: summary?.low_stock_count ?? 0,    color: "text-orange-600 bg-orange-500/10", href: "/reports?tab=low-stock" },
    { label: "Zero Stock",      value: summary?.out_of_stock_count ?? 0, color: "text-red-600 bg-red-500/10",      href: "/reports?tab=low-stock" },
    { label: "Stock In Today",  value: summary?.stock_in_today ?? 0,     color: "text-emerald-600 bg-emerald-500/10", href: "/reports?tab=stock-in" },
    { label: "Stock Out Today", value: summary?.stock_out_today ?? 0,    color: "text-purple-600 bg-purple-500/10",   href: "/reports?tab=stock-out" },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Bookmark className="w-4 h-4 text-blue-500" />Shortcuts</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {items.map(s => (
          <Link key={s.label} href={s.href}>
            <div className={`rounded-lg p-3 ${s.color} cursor-pointer hover:opacity-80 transition-opacity`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-0.5 font-medium">{s.label}</div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── main component ──────────────────────────────────────── */

export function Dashboard() {
  const { profile } = useAuth();
  const role = profile?.role ?? "viewer";

  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: alertItems, isLoading: alertLoading } = useGetDashboardLowStock();
  const { data: topOut, isLoading: topLoading } = useGetDashboardTopStockOut();
  const { data: trend, isLoading: trendLoading } = useGetDashboardMonthlyTrend();
  const { data: recentMovements, isLoading: recentLoading } = useGetRecentMovements({ limit: 10 });

  const alertCount = (summary?.low_stock_count ?? 0) + (summary?.out_of_stock_count ?? 0);

  const chartData = (trend ?? []).map(t => ({
    month: t.month.slice(5),
    "Stock In": t.stock_in,
    "Stock Out": t.stock_out,
  }));

  const topOutData = (topOut ?? []).map((t, i) => ({
    name: t.item_name.length > 20 ? t.item_name.slice(0, 20) + "…" : t.item_name,
    fullName: t.item_name,
    qty: t.total_out,
    rank: i + 1,
  }));

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <span className="text-sm text-muted-foreground hidden sm:block">{dateStr} · {timeStr}</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {sumLoading ? (
          Array.from<number>({ length: 6 }).map((_v, i) => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)
        ) : (
          <>
            <KpiCard title="Total Items"       value={summary?.total_items ?? 0}        icon={<Package        className="w-4 h-4 text-blue-600"    />} bg="bg-blue-500/10"    sub="Active items" />
            <KpiCard title="Stock Alert"       value={alertCount}                        icon={<AlertTriangle  className="w-4 h-4 text-red-600"     />} bg="bg-red-500/10"     sub={`${summary?.low_stock_count ?? 0} low · ${summary?.out_of_stock_count ?? 0} zero`} />
            <KpiCard title="Stock In (Month)"  value={summary?.stock_in_this_month ?? 0} icon={<ArrowDownToLine className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-500/10" sub="This month" />
            <KpiCard title="Stock Out (Month)" value={summary?.stock_out_this_month ?? 0} icon={<ArrowUpFromLine className="w-4 h-4 text-purple-600" />} bg="bg-purple-500/10" sub="This month" />
          </>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Alert table + Top Stock Out */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Stock Alert Items */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Stock Alert Items
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={() => exportAlertCsv(alertItems)} disabled={!alertItems?.length}>
                    <Download className="w-3 h-3" />Export
                  </Button>
                  <Link href="/reports?tab=low-stock">
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2">
                      <ExternalLink className="w-3 h-3" />View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto max-h-72">
                {alertLoading ? (
                  <div className="p-4 space-y-2">{Array.from<number>({ length: 4 }).map((_v, i) => <Skeleton key={i} />)}</div>
                ) : !alertItems?.length ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                    <AlertTriangle className="w-7 h-7 opacity-20" />
                    <span className="text-sm">No stock alerts</span>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Item ID</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Stock</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertItems.map(item => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-mono text-muted-foreground">{item.item_code}</td>
                          <td className="px-3 py-1.5 font-medium max-w-[120px] truncate">{item.item_name}</td>
                          <td className="px-3 py-1.5 text-right font-semibold">{item.current_stock}</td>
                          <td className="px-3 py-1.5 text-center">
                            {item.current_stock === 0
                              ? <Badge variant="destructive" className="text-xs py-0">Zero Stock</Badge>
                              : <Badge className="text-xs py-0 bg-orange-500 hover:bg-orange-600">Low Stock</Badge>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Top Stock Out */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpFromLine className="w-4 h-4 text-purple-500" /> Most Stock Out (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {topLoading ? (
                  <div className="h-56 bg-muted animate-pulse rounded" />
                ) : !topOutData.length ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                    <ArrowUpFromLine className="w-7 h-7 opacity-20" />
                    <span className="text-sm">No stock out data</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={[...topOutData].reverse()} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                        formatter={(val: number, _n: string, p) => [val, p.payload.fullName]}
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
              <CardTitle className="text-sm font-semibold">Stock In vs Stock Out — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Stock In"  fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Stock Out" fill="hsl(271 81% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
              <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
              <Link href="/reports?tab=movements">
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2">
                  <ExternalLink className="w-3 h-3" />View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentLoading ? (
                <div className="p-4 space-y-2">{Array.from<number>({ length: 4 }).map((_v, i) => <Skeleton key={i} />)}</div>
              ) : !recentMovements?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No transactions yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium">Item</th>
                      <th className="text-right px-4 py-2 text-muted-foreground font-medium">Qty</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium hidden md:table-cell">Ref No.</th>
                      <th className="text-left px-4 py-2 text-muted-foreground font-medium hidden lg:table-cell">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMovements.map(m => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground">{m.movement_date}</td>
                        <td className="px-4 py-2">
                          {m.movement_type === "IN"
                            ? <Badge className="text-xs py-0 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">IN</Badge>
                            : <Badge className="text-xs py-0 bg-purple-500/10 text-purple-600 hover:bg-purple-500/10">OUT</Badge>
                          }
                        </td>
                        <td className="px-4 py-2 font-medium max-w-[160px] truncate">{m.item_name ?? "—"} <span className="text-muted-foreground font-normal">({m.item_code})</span></td>
                        <td className={`px-4 py-2 text-right font-bold ${m.movement_type === "IN" ? "text-emerald-600" : "text-purple-600"}`}>
                          {m.movement_type === "IN" ? "+" : "-"}{m.quantity}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{m.reference_no ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">{m.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          <QuickActions role={role} />
          <StockSummary summary={summary} />
          <Shortcuts summary={summary} />
        </div>
      </div>
    </div>
  );
}
