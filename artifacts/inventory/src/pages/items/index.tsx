import { useState } from "react";
import { useListItems, useImportItems, useDeactivateItem } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { exportToExcel, parseExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Upload, QrCode, Search, Image as ImageIcon, Edit, Trash } from "lucide-react";
import QRCode from "qrcode";

export function ItemsPage() {
  const [search, setSearch] = useState("");
  const { data: items, isLoading, refetch } = useListItems({ search });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { toast } = useToast();
  const importItems = useImportItems();
  const deactivateItem = useDeactivateItem();

  const handleExport = () => {
    if (!items) return;
    exportToExcel(items, "Item_Master");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcel(file);
      await importItems.mutateAsync({ data: { items: data as any } });
      toast({ title: "Import successful" });
      setIsImportOpen(false);
      refetch();
    } catch (error) {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isQrOpen, setIsQrOpen] = useState(false);

  const showQr = async (itemCode: string) => {
    const url = await QRCode.toDataURL(`/stock-out?item_code=${itemCode}`);
    setQrCodeUrl(url);
    setIsQrOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to deactivate this item?")) {
      await deactivateItem.mutateAsync({ id });
      toast({ title: "Item deactivated" });
      refetch();
    }
  };

  if (isLoading) return <div className="p-8">Loading items...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Item Master</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import">
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Items from Excel</DialogTitle>
              </DialogHeader>
              <Input type="file" accept=".xlsx, .xls" onChange={handleImport} data-testid="input-file-import" />
            </DialogContent>
          </Dialog>
          <Button asChild data-testid="button-new-item">
            <Link href="/items/new"><Plus className="w-4 h-4 mr-2" /> Add Item</Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right font-mono">{item.current_stock} {item.unit}</TableCell>
                <TableCell>
                  <Badge variant={item.stock_status === "OK" ? "default" : item.stock_status === "Low Stock" ? "secondary" : "destructive"}>
                    {item.stock_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {item.photo_url && (
                      <Button variant="ghost" size="icon" asChild title="View Photo">
                        <a href={item.photo_url} target="_blank" rel="noreferrer"><ImageIcon className="w-4 h-4" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => showQr(item.item_code)} title="Show QR">
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Edit">
                      <Link href={`/items/${item.id}/edit`}><Edit className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Deactivate" className="text-destructive">
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8">
          <DialogHeader>
            <DialogTitle>Item QR Code</DialogTitle>
          </DialogHeader>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />}
          <p className="text-sm text-muted-foreground text-center mt-4">Scan to quickly stock out this item.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
