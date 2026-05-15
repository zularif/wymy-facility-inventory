import { useState } from "react";
import { useListStockMovements, ListStockMovementsMovementType } from "@workspace/api-client-react";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export function Movements() {
  const [type, setType] = useState<ListStockMovementsMovementType | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams: any = {};
  if (type !== "ALL") queryParams.movement_type = type;
  if (dateFrom) queryParams.date_from = dateFrom;
  if (dateTo) queryParams.date_to = dateTo;

  const { data: movements, isLoading } = useListStockMovements(queryParams);

  const handleExport = () => {
    if (!movements) return;
    exportToExcel(movements, "Stock_Movements");
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Movements</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Select value={type} onValueChange={(val: any) => setType(val)}>
            <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="IN">Stock In</SelectItem>
              <SelectItem value="OUT">Stock Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span>to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Ref No.</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No movements found</TableCell>
              </TableRow>
            ) : movements?.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell>{new Date(mov.movement_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {mov.movement_type === "IN" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <ArrowDownToLine className="w-3 h-3 mr-1" /> IN
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <ArrowUpFromLine className="w-3 h-3 mr-1" /> OUT
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{mov.item_code}</TableCell>
                <TableCell>{mov.item_name}</TableCell>
                <TableCell className={`text-right font-bold ${mov.movement_type === "IN" ? "text-green-600" : "text-blue-600"}`}>
                  {mov.movement_type === "IN" ? "+" : "-"}{mov.quantity}
                </TableCell>
                <TableCell>{mov.reference_no || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{mov.created_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
