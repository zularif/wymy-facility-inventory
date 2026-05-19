import { useState, useMemo } from "react";
import { useListItems, useImportItems, useDeactivateItem } from "@workspace/api-client-react";
import { Link } from "wouter";
import { exportToExcel, parseExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink, PaginationEllipsis } from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Upload, QrCode, Search, Image as ImageIcon, Edit, Trash, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import QRCode from "qrcode";

type SortKey = "code" | "category" | "status";
type SortDir = "asc" | "desc";
type Item = NonNullable<ReturnType<typeof useListItems>["data"]>[number];

const PAGE_SIZE = 25;

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export function ItemsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data: items, isLoading, refetch } = useListItems({ search });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { toast } = useToast();
  const importItems = useImportItems();
  const deactivateItem = useDeactivateItem();

  const categories = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(i => i.category).filter(Boolean))].sort() as string[];
  }, [items]);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    const filtered = categoryFilter === "all" ? items : items.filter(i => i.category === categoryFilter);
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "code") {
        cmp = naturalCompare(a.item_code ?? "", b.item_code ?? "");
      } else if (sortKey === "category") {
        cmp = naturalCompare(a.category ?? "", b.category ?? "");
        if (cmp === 0) cmp = naturalCompare(a.item_code ?? "", b.item_code ?? "");
      } else {
        cmp = naturalCompare(a.stock_status ?? "", b.stock_status ?? "");
        if (cmp === 0) cmp = naturalCompare(a.item_code ?? "", b.item_code ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleCategoryFilter = (val: string) => {
    setCategoryFilter(val);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="inline w-3 h-3 ml-1 text-muted-foreground" />;
    return sortDir === "asc"
      ? <ChevronUp className="inline w-3 h-3 ml-1" />
      : <ChevronDown className="inline w-3 h-3 ml-1" />;
  };

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
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [detailQr, setDetailQr] = useState<string>("");

  const showQr = async (itemCode: string) => {
    const fullUrl = `${window.location.origin}/stock-out?item_code=${itemCode}`;
    const url = await QRCode.toDataURL(fullUrl);
    setQrCodeUrl(url);
    setIsQrOpen(true);
  };

  const openDetail = async (item: Item) => {
    setDetailItem(item);
    const fullUrl = `${window.location.origin}/stock-out?item_code=${item.item_code}`;
    const url = await QRCode.toDataURL(fullUrl, { width: 160 });
    setDetailQr(url);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to deactivate this item?")) {
      await deactivateItem.mutateAsync({ id });
      toast({ title: "Item deactivated" });
      refetch();
    }
  };

  // Build page numbers to display (max 5 visible pages with ellipsis)
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  if (isLoading) return <div className="p-8">Loading items...</div>;

  const start = sortedItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, sortedItems.length);

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

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryFilter !== "all" && (
          <button
            onClick={() => handleCategoryFilter("all")}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {sortedItems.length === 0 ? "No items" : `Showing ${start}–${end} of ${sortedItems.length}`}
        </span>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("code")}>
                Code<SortIcon col="code" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                Category<SortIcon col="category" />
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                Status<SortIcon col="status" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items found</TableCell>
              </TableRow>
            ) : pageItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>
                  <button
                    onClick={() => openDetail(item)}
                    className="text-left hover:underline text-primary font-medium"
                  >
                    {item.item_name}
                  </button>
                </TableCell>
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (safePage > 1) setPage(safePage - 1); }}
                className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === safePage}
                    onClick={(e) => { e.preventDefault(); setPage(p as number); }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (safePage < totalPages) setPage(safePage + 1); }}
                className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8">
          <DialogHeader>
            <DialogTitle>Item QR Code</DialogTitle>
          </DialogHeader>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />}
          <p className="text-sm text-muted-foreground text-center mt-4">Scan to quickly stock out this item.</p>
        </DialogContent>
      </Dialog>

      {/* Item Detail Sheet */}
      <Sheet open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <div>
                    <SheetTitle className="text-xl">{detailItem.item_name}</SheetTitle>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{detailItem.item_code}</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/items/${detailItem.id}/edit`}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Link>
                  </Button>
                </div>
              </SheetHeader>

              {/* Photo */}
              {detailItem.photo_url && (
                <div className="mb-4 rounded-md overflow-hidden border bg-muted flex items-center justify-center h-52">
                  <img
                    src={detailItem.photo_url}
                    alt={detailItem.item_name}
                    className="object-contain h-full w-full"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Status badge + stock */}
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={
                  detailItem.stock_status === "OK" ? "default"
                  : detailItem.stock_status === "Low Stock" ? "secondary"
                  : "destructive"
                }>
                  {detailItem.stock_status}
                </Badge>
                <span className="text-sm font-medium">
                  Current Stock: <span className="font-mono">{detailItem.current_stock} {detailItem.unit}</span>
                </span>
              </div>

              <Separator className="mb-4" />

              {/* Fields grid */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                <div>
                  <dt className="text-muted-foreground font-medium">Category</dt>
                  <dd className="mt-0.5">{detailItem.category || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Unit</dt>
                  <dd className="mt-0.5">{detailItem.unit}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Location / Rack</dt>
                  <dd className="mt-0.5">{detailItem.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Min Stock Level</dt>
                  <dd className="mt-0.5">{detailItem.min_stock ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Min Order Qty</dt>
                  <dd className="mt-0.5">{detailItem.minimum_order ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground font-medium">Specification</dt>
                  <dd className="mt-0.5">{detailItem.spec || "—"}</dd>
                </div>
              </dl>

              <Separator className="mb-4" />

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground font-medium">QR Code — scan to stock out</p>
                {detailQr && <img src={detailQr} alt="QR Code" className="w-36 h-36" />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
