import { useState } from "react";
import { useListItems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Search } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";

export function Labels() {
  const [search, setSearch] = useState("");
  const { data: items, isLoading } = useListItems({ search });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === items?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items?.map(i => i.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const printLabels = async () => {
    if (!items || selectedIds.size === 0) return;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const selectedItems = items.filter(i => selectedIds.has(i.id));
    
    // A4 dimensions: 210 x 297 mm
    // 2 columns, 4 rows = 8 labels per page
    const labelW = 95;
    const labelH = 65;
    const marginX = 10;
    const marginY = 15;
    const gapX = 0;
    const gapY = 5;

    for (let i = 0; i < selectedItems.length; i++) {
      if (i > 0 && i % 8 === 0) {
        doc.addPage();
      }

      const item = selectedItems[i];
      const pageIdx = i % 8;
      const col = pageIdx % 2;
      const row = Math.floor(pageIdx / 2);

      const x = marginX + (col * (labelW + gapX));
      const y = marginY + (row * (labelH + gapY));

      // Draw label border
      doc.rect(x, y, labelW, labelH);

      // Generate QR
      const qrDataUrl = await QRCode.toDataURL(`/stock-out?item_code=${item.item_code}`, { margin: 1 });
      
      // QR Code on right side
      doc.addImage(qrDataUrl, 'PNG', x + labelW - 35, y + 5, 30, 30);

      // Text content
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(item.item_code, x + 5, y + 12);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(item.item_name, x + 5, y + 22, { maxWidth: labelW - 40 });
      
      doc.setFontSize(9);
      doc.text(`Category: ${item.category || "-"}`, x + 5, y + 35);
      doc.text(`Location: ${item.location || "-"}`, x + 5, y + 42);
      doc.text(`Min Order: ${item.minimum_order || "-"}`, x + 5, y + 49);
      if (item.spec) {
        doc.text(`Spec: ${item.spec}`, x + 5, y + 56, { maxWidth: labelW - 10 });
      }
    }

    doc.save("rack_labels.pdf");
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Rack Labels</h1>
        <Button onClick={printLabels} disabled={selectedIds.size === 0}>
          <Printer className="w-4 h-4 mr-2" /> Print PDF ({selectedIds.size})
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items to label..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={items?.length! > 0 && selectedIds.size === items?.length} 
                  onCheckedChange={toggleSelectAll} 
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(item.id)} 
                    onCheckedChange={() => toggleSelect(item.id)} 
                  />
                </TableCell>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.location || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
