import { useState } from "react";
import {
  useGetReportCurrentStock,
  useListStockMovements,
  useGetReportLowStock,
  type ItemWithStock,
  type StockMovement,
} from "@workspace/api-client-react";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download, Scale, History, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Wrench, FileDown,
} from "lucide-react";
import { useSearch } from "wouter";

function StockBalanceReport() {
  const [search, setSearch] = useState("");
  const { data: allStock, isLoading } = useGetReportCurrentStock({});
  const data = search
    ? allStock?.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()) || i.item_code.toLowerCase().includes(search.toLowerCase()))
    : allStock;

  const statusBadge = (s: string) => {
    if (s === "Out of Stock") return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    if (s === "Low Stock") return <Badge className="text-xs bg-orange-500 hover:bg-orange-600">Low Stock</Badge>;
    return <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500">OK</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Input placeholder="Search items…" className="max-w-xs h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => data && exportToExcel(data, "Stock_Balance")}>
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from<number>({ length: 5 }).map((_v, i) => (
                <TableRow key={i}><TableCell colSpan={7}><div className="h-5 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
              : data?.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.item_code}</TableCell>
                  <TableCell className="font-medium">{i.item_name}</TableCell>
                  <TableCell>{i.category ?? "—"}</TableCell>
                  <TableCell>{i.location ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{i.current_stock}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell>{statusBadge(i.stock_status)}</TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MovementReport({ type }: { type?: "IN" | "OUT" }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryParams: Record<string, unknown> = {};
  if (type) queryParams.movement_type = type;
  if (dateFrom) queryParams.date_from = dateFrom;
  if (dateTo) queryParams.date_to = dateTo;
  const { data, isLoading } = useListStockMovements(queryParams);

  const typeBadge = (t: string) =>
    t === "IN"
      ? <Badge className="text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10"><ArrowDownToLine className="w-3 h-3 mr-1" />IN</Badge>
      : <Badge className="text-xs bg-purple-500/10 text-purple-600 hover:bg-purple-500/10"><ArrowUpFromLine className="w-3 h-3 mr-1" />OUT</Badge>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 items-center">
          <Input type="date" className="h-8 text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" className="h-8 text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        </div>
        <Button variant="outline" size="sm" onClick={() => data && exportToExcel(data, type ? `Stock_${type}_Report` : "Stock_Movement_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {!type && <TableHead>Type</TableHead>}
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Reference No.</TableHead>
              {type === "IN" && <TableHead>Supplier</TableHead>}
              {type === "OUT" && <TableHead>Requested By</TableHead>}
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from<number>({ length: 5 }).map((_v, i) => (
                <TableRow key={i}><TableCell colSpan={8}><div className="h-5 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
              : data?.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{m.movement_date}</TableCell>
                  {!type && <TableCell>{typeBadge(m.movement_type)}</TableCell>}
                  <TableCell className="font-mono text-xs">{m.item_code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{m.item_name ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.reference_no ?? "—"}</TableCell>
                  {type === "IN" && <TableCell>{m.supplier ?? "—"}</TableCell>}
                  {type === "OUT" && <TableCell>{m.requested_by ?? "—"}</TableCell>}
                  <TableCell className="text-xs text-muted-foreground">{m.created_by}</TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LowStockReport() {
  const { data, isLoading } = useGetReportLowStock();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => data && exportToExcel(data, "Low_Stock_Alert_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Min Order</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from<number>({ length: 5 }).map((_v, i) => (
                <TableRow key={i}><TableCell colSpan={8}><div className="h-5 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
              : data?.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.item_code}</TableCell>
                  <TableCell className="font-medium">{i.item_name}</TableCell>
                  <TableCell>{i.category ?? "—"}</TableCell>
                  <TableCell>{i.location ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{i.current_stock}</TableCell>
                  <TableCell className="text-right">{i.min_stock ?? "—"}</TableCell>
                  <TableCell className="text-right">{i.minimum_order ?? "—"}</TableCell>
                  <TableCell>
                    {i.current_stock === 0
                      ? <Badge variant="destructive" className="text-xs">Zero Stock</Badge>
                      : <Badge className="text-xs bg-orange-500 hover:bg-orange-600">Low Stock</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TechnicianUsageReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryParams: Record<string, unknown> = { movement_type: "OUT" };
  if (dateFrom) queryParams.date_from = dateFrom;
  if (dateTo) queryParams.date_to = dateTo;
  const { data, isLoading } = useListStockMovements(queryParams);

  const grouped = (data ?? []).reduce<Record<string, { total: number; count: number; items: Set<string> }>>((acc, m) => {
    const key = m.created_by;
    if (!acc[key]) acc[key] = { total: 0, count: 0, items: new Set() };
    acc[key].total += m.quantity;
    acc[key].count++;
    if (m.item_name) acc[key].items.add(m.item_name);
    return acc;
  }, {});

  const rows = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  const exportData = rows.map(([user, v], i) => ({ rank: i + 1, user, transactions: v.count, total_qty: v.total }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 items-center">
          <Input type="date" className="h-8 text-sm w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" className="h-8 text-sm w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, "Technician_Usage_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Total Qty Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from<number>({ length: 4 }).map((_v, i) => (
                <TableRow key={i}><TableCell colSpan={4}><div className="h-5 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
              : rows.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No stock out data found</TableCell></TableRow>
                : rows.map(([user, v], i) => (
                  <TableRow key={user}>
                    <TableCell className="text-muted-foreground font-mono">#{i + 1}</TableCell>
                    <TableCell className="font-medium">{user}</TableCell>
                    <TableCell className="text-right">{v.count}</TableCell>
                    <TableCell className="text-right font-semibold">{v.total}</TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExportPanel() {
  const { data: currentStock } = useGetReportCurrentStock({});
  const { data: movements } = useListStockMovements({});
  const { data: lowStock } = useGetReportLowStock();
  const { data: stockIn } = useListStockMovements({ movement_type: "IN" });
  const { data: stockOut } = useListStockMovements({ movement_type: "OUT" });

  const exports: { label: string; desc: string; data: ItemWithStock[] | StockMovement[] | undefined; filename: string; icon: React.ReactNode; color: string }[] = [
    { label: "Stock Balance",      desc: "All items with current stock levels",  data: currentStock, filename: "Stock_Balance",      icon: <Scale className="w-5 h-5" />,          color: "text-blue-600 bg-blue-500/10" },
    { label: "Stock Movement",     desc: "Full movement history (IN + OUT)",     data: movements,    filename: "Stock_Movement",     icon: <History className="w-5 h-5" />,         color: "text-purple-600 bg-purple-500/10" },
    { label: "Low Stock Alert",    desc: "Items below minimum stock level",      data: lowStock,     filename: "Low_Stock_Alert",    icon: <AlertTriangle className="w-5 h-5" />,   color: "text-orange-600 bg-orange-500/10" },
    { label: "Stock In Report",    desc: "All stock in transactions",            data: stockIn,      filename: "Stock_In_Report",    icon: <ArrowDownToLine className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Stock Out Report",   desc: "All stock out transactions",           data: stockOut,     filename: "Stock_Out_Report",   icon: <ArrowUpFromLine className="w-5 h-5" />, color: "text-red-600 bg-red-500/10" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Click any button to download the report as an Excel file.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exports.map(e => (
          <Card key={e.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${e.color}`}>{e.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{e.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-7 text-xs w-full"
                    disabled={!e.data?.length}
                    onClick={() => e.data && exportToExcel(e.data, e.filename)}
                  >
                    <FileDown className="w-3.5 h-3.5 mr-1.5" /> Download Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const raw = useSearch();
  const params = new URLSearchParams(raw);
  const defaultTab = params.get("tab") ?? "balance";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="balance"    className="gap-2"><Scale className="w-4 h-4" /> Stock Balance</TabsTrigger>
          <TabsTrigger value="movements"  className="gap-2"><History className="w-4 h-4" /> Stock Movement</TabsTrigger>
          <TabsTrigger value="low-stock"  className="gap-2"><AlertTriangle className="w-4 h-4" /> Low Stock Alert</TabsTrigger>
          <TabsTrigger value="stock-in"   className="gap-2"><ArrowDownToLine className="w-4 h-4" /> Stock In</TabsTrigger>
          <TabsTrigger value="stock-out"  className="gap-2"><ArrowUpFromLine className="w-4 h-4" /> Stock Out</TabsTrigger>
          <TabsTrigger value="tech-usage" className="gap-2"><Wrench className="w-4 h-4" /> Technician Usage</TabsTrigger>
          <TabsTrigger value="export"     className="gap-2"><FileDown className="w-4 h-4" /> Export</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="balance">    <StockBalanceReport /></TabsContent>
          <TabsContent value="movements">  <MovementReport /></TabsContent>
          <TabsContent value="low-stock">  <LowStockReport /></TabsContent>
          <TabsContent value="stock-in">   <MovementReport type="IN" /></TabsContent>
          <TabsContent value="stock-out">  <MovementReport type="OUT" /></TabsContent>
          <TabsContent value="tech-usage"> <TechnicianUsageReport /></TabsContent>
          <TabsContent value="export">     <ExportPanel /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
