import { useState } from "react";
import { useListItems } from "@workspace/api-client-react";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";

export function Balance() {
  const [search, setSearch] = useState("");
  const { data: items, isLoading } = useListItems({ search });

  const handleExport = () => {
    if (!items) return;
    exportToExcel(items, "Stock_Balance");
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Balance</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items found</TableCell>
              </TableRow>
            ) : items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.category || "-"}</TableCell>
                <TableCell>{item.location || "-"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.min_stock || "-"}</TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {item.current_stock} {item.unit}
                </TableCell>
                <TableCell>
                  <Badge variant={item.stock_status === "OK" ? "default" : item.stock_status === "Low Stock" ? "secondary" : "destructive"}>
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
