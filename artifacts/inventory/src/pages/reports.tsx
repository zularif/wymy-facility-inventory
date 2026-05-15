import { useState } from "react";
import { useGetReportCurrentStock, useListStockMovements, useGetReportLowStock } from "@workspace/api-client-react";
import { exportToExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

function CurrentStockReport() {
  const { data, isLoading } = useGetReportCurrentStock({});
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => data && exportToExcel(data, "Current_Stock_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export to Excel
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map(i => (
              <TableRow key={i.id}>
                <TableCell>{i.item_code}</TableCell>
                <TableCell>{i.item_name}</TableCell>
                <TableCell>{i.location || "-"}</TableCell>
                <TableCell className="text-right">{i.current_stock} {i.unit}</TableCell>
                <TableCell>{i.stock_status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MovementHistoryReport() {
  const { data, isLoading } = useListStockMovements({});
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => data && exportToExcel(data, "Movement_History_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export to Excel
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map(m => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.movement_date).toLocaleDateString()}</TableCell>
                <TableCell>{m.movement_type}</TableCell>
                <TableCell>{m.item_name} ({m.item_code})</TableCell>
                <TableCell className="text-right">{m.quantity}</TableCell>
                <TableCell>{m.reference_no}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LowStockReport() {
  const { data, isLoading } = useGetReportLowStock();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => data && exportToExcel(data, "Low_Stock_Report")}>
          <Download className="w-4 h-4 mr-2" /> Export to Excel
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Min Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map(i => (
              <TableRow key={i.id}>
                <TableCell>{i.item_code}</TableCell>
                <TableCell>{i.item_name}</TableCell>
                <TableCell className="text-right">{i.current_stock}</TableCell>
                <TableCell className="text-right">{i.min_stock}</TableCell>
                <TableCell className="text-right">{i.minimum_order}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Tabs defaultValue="current-stock" className="w-full">
        <TabsList>
          <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
          <TabsTrigger value="movement-history">Movement History</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="current-stock"><CurrentStockReport /></TabsContent>
          <TabsContent value="movement-history"><MovementHistoryReport /></TabsContent>
          <TabsContent value="low-stock"><LowStockReport /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
