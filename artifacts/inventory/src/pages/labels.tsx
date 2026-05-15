import { useState, useMemo } from "react";
import { useListItems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Search } from "lucide-react";

import QRCode from "qrcode";
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  ImageRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeightRule,
  VerticalAlign,
  ShadingType,
  convertInchesToTwip,
} from "docx";

type Item = NonNullable<ReturnType<typeof useListItems>["data"]>[number];

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function sortByCategory(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const cat = naturalCompare(a.category ?? "", b.category ?? "");
    if (cat !== 0) return cat;
    return naturalCompare(a.item_code ?? "", b.item_code ?? "");
  });
}

async function qrToBase64(text: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 180 });
  return dataUrl.split(",")[1];
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "888888" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "888888" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "888888" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "888888" },
};

const photoBorder = {
  top: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  bottom: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  left: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  right: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
};

function infoLine(label: string, value: string | null | undefined): Paragraph {
  return new Paragraph({
    spacing: { after: 20 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 16, font: "Calibri" }),
      new TextRun({ text: value || "—", size: 16, font: "Calibri" }),
    ],
  });
}

async function buildLabelCell(item: Item): Promise<DocxTableCell> {
  const qrB64 = await qrToBase64(`${window.location.origin}/stock-out?item_code=${item.item_code}`);
  const qrData = base64ToUint8Array(qrB64);

  // Right column: QR + photo box stacked
  const rightCol = new DocxTableCell({
    width: { size: convertInchesToTwip(1.4), type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      // QR code
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            data: qrData,
            transformation: { width: 90, height: 90 },
            type: "png",
          }),
        ],
      }),
      // Photo placeholder — dashed bordered box
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: "" })],
      }),
      new DocxTable({
        width: { size: convertInchesToTwip(1.2), type: WidthType.DXA },
        rows: [
          new DocxTableRow({
            height: { value: convertInchesToTwip(1.1), rule: HeightRule.EXACT },
            children: [
              new DocxTableCell({
                width: { size: convertInchesToTwip(1.2), type: WidthType.DXA },
                borders: photoBorder,
                shading: { type: ShadingType.SOLID, color: "F8F8F8", fill: "F8F8F8" },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "📷 PHOTO", size: 18, color: "AAAAAA", font: "Calibri" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Left column: all text info
  const leftCol = new DocxTableCell({
    width: { size: convertInchesToTwip(2.8), type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        spacing: { after: 30 },
        children: [
          new TextRun({ text: item.item_code, bold: true, size: 26, font: "Calibri", color: "1a1a1a" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: item.item_name, bold: true, size: 20, font: "Calibri", color: "333333" }),
        ],
      }),
      infoLine("Category", item.category),
      infoLine("Location", item.location),
      infoLine("Unit", item.unit),
      infoLine("Min Stock", item.min_stock != null ? String(item.min_stock) : null),
      infoLine("Min Order", item.minimum_order != null ? String(item.minimum_order) : null),
      ...(item.spec ? [infoLine("Spec", item.spec)] : []),
    ],
  });

  // Inner label table (2 cols: text | QR+photo)
  const innerTable = new DocxTable({
    width: { size: convertInchesToTwip(4.35), type: WidthType.DXA },
    rows: [
      new DocxTableRow({
        children: [leftCol, rightCol],
      }),
    ],
  });

  // Outer label cell with visible border
  return new DocxTableCell({
    width: { size: convertInchesToTwip(4.5), type: WidthType.DXA },
    borders: thinBorder,
    margins: {
      top: convertInchesToTwip(0.1),
      bottom: convertInchesToTwip(0.1),
      left: convertInchesToTwip(0.12),
      right: convertInchesToTwip(0.08),
    },
    children: [innerTable],
  });
}

function emptyCell(): DocxTableCell {
  return new DocxTableCell({
    width: { size: convertInchesToTwip(4.5), type: WidthType.DXA },
    borders: noBorder,
    children: [new Paragraph({ children: [] })],
  });
}

async function exportToWord(items: Item[]) {
  const rows: DocxTableRow[] = [];

  for (let i = 0; i < items.length; i += 2) {
    const leftCell = await buildLabelCell(items[i]);
    const gapCell = new DocxTableCell({
      width: { size: convertInchesToTwip(0.3), type: WidthType.DXA },
      borders: noBorder,
      children: [new Paragraph({ children: [] })],
    });
    const rightCell = items[i + 1] ? await buildLabelCell(items[i + 1]) : emptyCell();
    rows.push(
      new DocxTableRow({
        children: [leftCell, gapCell, rightCell],
      }),
      // Spacer row
      new DocxTableRow({
        height: { value: convertInchesToTwip(0.15), rule: HeightRule.EXACT },
        children: [
          new DocxTableCell({ borders: noBorder, children: [new Paragraph({ children: [] })] }),
          new DocxTableCell({ borders: noBorder, children: [new Paragraph({ children: [] })] }),
          new DocxTableCell({ borders: noBorder, children: [new Paragraph({ children: [] })] }),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: "Rack Labels", bold: true, size: 28, font: "Calibri" }),
            ],
          }),
          new DocxTable({
            width: { size: convertInchesToTwip(9.3), type: WidthType.DXA },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rack_labels.docx";
  a.click();
  URL.revokeObjectURL(url);
}

export function Labels() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: items, isLoading } = useListItems({ search });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [wordExporting, setWordExporting] = useState(false);

  const categories = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(i => i.category).filter(Boolean))].sort() as string[];
  }, [items]);

  const displayItems = useMemo(() => {
    if (!items) return [];
    const filtered = categoryFilter === "all" ? items : items.filter(i => i.category === categoryFilter);
    return sortByCategory(filtered);
  }, [items, categoryFilter]);

  const toggleSelectAll = () => {
    if (displayItems.length > 0 && selectedIds.size === displayItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayItems.map(i => i.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const printPDF = async () => {
    if (!items || selectedIds.size === 0) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const selectedItems = sortByCategory(items.filter(i => selectedIds.has(i.id)));

    const labelW = 95, labelH = 65, marginX = 10, marginY = 15, gapY = 5;

    for (let i = 0; i < selectedItems.length; i++) {
      if (i > 0 && i % 8 === 0) doc.addPage();
      const item = selectedItems[i];
      const pageIdx = i % 8;
      const col = pageIdx % 2;
      const row = Math.floor(pageIdx / 2);
      const x = marginX + col * labelW;
      const y = marginY + row * (labelH + gapY);

      doc.rect(x, y, labelW, labelH);
      const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/stock-out?item_code=${item.item_code}`, { margin: 1 });
      doc.addImage(qrDataUrl, "PNG", x + labelW - 35, y + 5, 28, 28);

      // Photo box placeholder
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(x + labelW - 35, y + 36, 28, 22);
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text("PHOTO", x + labelW - 24, y + 49, { align: "center" });
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(item.item_code, x + 4, y + 11);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(item.item_name, x + 4, y + 19, { maxWidth: labelW - 40 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Category: ${item.category || "-"}`, x + 4, y + 31);
      doc.text(`Location: ${item.location || "-"}`, x + 4, y + 37);
      doc.text(`Unit: ${item.unit}`, x + 4, y + 43);
      doc.text(`Min Stock: ${item.min_stock ?? "-"}`, x + 4, y + 49);
      if (item.spec) doc.text(`Spec: ${item.spec}`, x + 4, y + 55, { maxWidth: labelW - 40 });
    }

    doc.save("rack_labels.pdf");
  };

  const handleWordExport = async () => {
    if (!items || selectedIds.size === 0) return;
    setWordExporting(true);
    try {
      const selectedItems = sortByCategory(items.filter(i => selectedIds.has(i.id)));
      await exportToWord(selectedItems);
    } finally {
      setWordExporting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Rack Labels</h1>
          <p className="text-sm text-muted-foreground mt-1">Select items then export to PDF or Word</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printPDF} disabled={selectedIds.size === 0}>
            <Printer className="w-4 h-4 mr-2" /> PDF ({selectedIds.size})
          </Button>
          <Button onClick={handleWordExport} disabled={selectedIds.size === 0 || wordExporting}>
            <FileText className="w-4 h-4 mr-2" />
            {wordExporting ? "Generating..." : `Word (${selectedIds.size})`}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items to label..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-[180px]">
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
            onClick={() => { setCategoryFilter("all"); setSelectedIds(new Set()); }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${displayItems.length} items`}
        </span>
      </div>

      <div className="border rounded-md h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={displayItems.length > 0 && selectedIds.size === displayItems.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => toggleSelect(item.id)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.category || "—"}</TableCell>
                <TableCell>{item.location || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
