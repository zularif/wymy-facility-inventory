import { useGetDashboardLowStock } from "@workspace/api-client-react";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from "lucide-react";

export function LowStock() {
  const { data: items, isLoading } = useGetDashboardLowStock();

  const handleExport = () => {
    if (!items) return;
    exportToExcel(items, "Low_Stock_Alerts");
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="text-amber-500 w-6 h-6" /> Low Stock Alerts
        </h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Min Order Qty</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No low stock items</TableCell>
              </TableRow>
            ) : items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.location || "-"}</TableCell>
                <TableCell className="text-right font-mono font-bold text-red-600">
                  {item.current_stock} {item.unit}
                </TableCell>
                <TableCell className="text-right font-mono">{item.min_stock}</TableCell>
                <TableCell className="text-right font-mono">{item.minimum_order || "-"}</TableCell>
                <TableCell>
                  <Badge variant={item.stock_status === "Out of Stock" ? "destructive" : "secondary"}>
                    {item.stock_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
