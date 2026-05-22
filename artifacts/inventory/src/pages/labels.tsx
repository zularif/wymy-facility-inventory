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
  Document, Packer, Paragraph, TextRun,
  Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell,
  ImageRun, WidthType, BorderStyle, AlignmentType, HeightRule,
  VerticalAlign, ShadingType, convertInchesToTwip,
} from "docx";

type Item = NonNullable<ReturnType<typeof useListItems>["data"]>[number];

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function sortByCategory(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const cat = naturalCompare(a.category ?? "", b.category ?? "");
    return cat !== 0 ? cat : naturalCompare(a.item_code ?? "", b.item_code ?? "");
  });
}

function recordUrl(itemCode: string): string {
  return `${window.location.origin}/record?item_code=${itemCode}&type=out`;
}

async function qrToBase64(text: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 1, width: 200 });
  return dataUrl.split(",")[1];
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function fetchPhotoForWord(url: string): Promise<{ data: Uint8Array; type: "png" | "jpg" } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") ?? "";
    const type: "png" | "jpg" = ct.includes("jpeg") || ct.includes("jpg") || /\.(jpe?g)$/i.test(url) ? "jpg" : "png";
    return { data: new Uint8Array(await resp.arrayBuffer()), type };
  } catch { return null; }
}

async function fetchPhotoAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/* ─── PDF label renderer ──────────────────────────────────── */

// Colours
const NAVY  = [0, 43, 125] as const;   // #002B7D
const WHITE = [255, 255, 255] as const;
const BLACK = [20, 20, 20] as const;
const GRAY  = [130, 130, 130] as const;

// Layout (mm) — A4 portrait, 2 labels per page
const LX = 10;
const LW = 190;
const LH = 135;
const L_TOP = [8, 8 + LH + 9] as const; // y-start of label 1 and 2

function setNavy(doc: jsPDF) { doc.setFillColor(...NAVY); doc.setDrawColor(...NAVY); doc.setTextColor(...NAVY); }
function setWhiteText(doc: jsPDF) { doc.setTextColor(...WHITE); }
function setBlackText(doc: jsPDF) { doc.setTextColor(...BLACK); }
function setGray(doc: jsPDF) { doc.setDrawColor(...GRAY); doc.setTextColor(...GRAY); }

async function drawLabel(doc: jsPDF, item: Item, lx: number, ly: number) {
  const qrDataUrl = await QRCode.toDataURL(recordUrl(item.item_code), { margin: 1, width: 200 });
  const photoDataUrl = item.photo_url ? await fetchPhotoAsDataUrl(item.photo_url) : null;

  // ── Outer rounded border ──────────────────────────────────
  setNavy(doc);
  doc.setLineWidth(0.7);
  doc.roundedRect(lx, ly, LW, LH, 3, 3, "S");

  // ── Header bar ───────────────────────────────────────────
  setNavy(doc);
  doc.roundedRect(lx, ly, LW, 20, 3, 3, "F");
  // Flatten bottom corners of header bar
  doc.rect(lx, ly + 10, LW, 10, "F");

  // Header title
  setWhiteText(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("FACILITY INVENTORY CARD", lx + LW / 2, ly + 13, { align: "center" });

  // Decorative chevrons
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("// //  //", lx + LW / 2, ly + 18.5, { align: "center" });

  // ── RIGHT PANEL ──────────────────────────────────────────
  const rx = lx + 140;  // right panel x-start
  const ry = ly + 24;   // right panel y-start

  // QR code box
  const qrSize = 44;
  setNavy(doc);
  doc.setLineWidth(0.5);
  doc.roundedRect(rx, ry, qrSize, qrSize, 1, 1, "S");
  doc.addImage(qrDataUrl, "PNG", rx + 1, ry + 1, qrSize - 2, qrSize - 2);

  // "SCAN TO RECORD USAGE" bar
  const scanY = ry + qrSize + 2;
  setNavy(doc);
  doc.rect(rx, scanY, qrSize, 9, "F");
  setWhiteText(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.text("SCAN TO RECORD USAGE", rx + qrSize / 2, scanY + 6, { align: "center" });

  // Photo box
  const photoY = scanY + 11;
  const photoH = LH - (photoY - ly) - 6;
  doc.setLineWidth(0.5);
  setGray(doc);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.roundedRect(rx, photoY, qrSize, photoH, 1, 1, "S");
  doc.setLineDashPattern([], 0);

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, rx + 1, photoY + 1, qrSize - 2, photoH - 2);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    setGray(doc);
    doc.text("PHOTO", rx + qrSize / 2, photoY + photoH / 2 + 2, { align: "center" });
  }

  // ── LEFT PANEL ───────────────────────────────────────────
  const leftX = lx + 8;
  const contentY = ly + 24;

  // Item code badge
  const badgeText = item.item_code;
  const badgeW = Math.min(doc.getStringUnitWidth(badgeText) * 8.5 * 0.352 + 14, 70);
  setNavy(doc);
  doc.roundedRect(leftX, contentY, badgeW, 10, 1.5, 1.5, "F");
  setWhiteText(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(badgeText, leftX + badgeW / 2, contentY + 7, { align: "center" });

  // Item name
  setBlackText(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const maxNameW = 125;
  const nameLines = doc.splitTextToSize(item.item_name, maxNameW);
  doc.text(nameLines, leftX, contentY + 21);
  const nameBlockH = nameLines.length * 6;

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(leftX, contentY + 21 + nameBlockH + 2, lx + 135, contentY + 21 + nameBlockH + 2);

  // Detail rows
  const details: { label: string; value: string }[] = [
    { label: "Category",  value: item.category  || "—" },
    { label: "Location",  value: item.location  || "—" },
    { label: "Unit",      value: item.unit },
    { label: "Min Stock", value: item.min_stock     != null ? String(item.min_stock)     : "—" },
    { label: "Min Order", value: item.minimum_order != null ? String(item.minimum_order) : "—" },
    ...(item.spec ? [{ label: "Spec", value: item.spec }] : []),
  ];

  let rowY = contentY + 21 + nameBlockH + 9;
  const maxDetailW = 88;

  for (const d of details) {
    if (rowY > ly + LH - 5) break;  // overflow guard

    // Small navy circle icon
    setNavy(doc);
    doc.setLineWidth(0.4);
    doc.circle(leftX + 2.5, rowY - 2, 2.5, "S");

    // Label (bold)
    setBlackText(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(d.label, leftX + 7, rowY);

    // Colon separator
    doc.setFont("helvetica", "normal");
    doc.text(":", leftX + 35, rowY);

    // Value (wraps if long)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const valueLines = doc.splitTextToSize(d.value, maxDetailW);
    doc.text(valueLines, leftX + 40, rowY);
    doc.setTextColor(...BLACK);

    rowY += 8 + (valueLines.length > 1 ? (valueLines.length - 1) * 4 : 0);
  }
}

async function exportToPDF(items: Item[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % 2 === 0) doc.addPage();
    const slot = i % 2;
    await drawLabel(doc, items[i], LX, L_TOP[slot as 0 | 1]);
  }

  doc.save("facility_inventory_cards.pdf");
}

/* ─── Word export ─────────────────────────────────────────── */

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};
const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "002B7D" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "002B7D" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "002B7D" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "002B7D" },
};
const photoBorder = {
  top: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  bottom: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  left: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
  right: { style: BorderStyle.DASHED, size: 8, color: "AAAAAA" },
};

const LABEL_W = 3.55, GAP_W = 0.2, INNER_W = 3.3, LEFT_W = 2.05, RIGHT_W = 1.2, PHOTO_W = 1.1;

function infoRow(label: string, value: string | null | undefined): Paragraph {
  return new Paragraph({
    spacing: { after: 24 },
    children: [
      new TextRun({ text: `${label}:`, bold: true, size: 16, font: "Calibri", color: "002B7D" }),
      new TextRun({ text: "  " + (value || "—"), size: 16, font: "Calibri", color: "333333" }),
    ],
  });
}

async function buildWordLabelCell(item: Item): Promise<DocxTableCell> {
  const qrB64 = await qrToBase64(recordUrl(item.item_code));
  const qrData = base64ToUint8Array(qrB64);
  const photo = item.photo_url ? await fetchPhotoForWord(item.photo_url) : null;

  const photoCell = photo
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: photo.data, transformation: { width: 80, height: 72 }, type: photo.type })],
      })
    : new DocxTable({
        width: { size: convertInchesToTwip(PHOTO_W), type: WidthType.DXA },
        rows: [new DocxTableRow({
          height: { value: convertInchesToTwip(0.95), rule: HeightRule.EXACT },
          children: [new DocxTableCell({
            width: { size: convertInchesToTwip(PHOTO_W), type: WidthType.DXA },
            borders: photoBorder,
            shading: { type: ShadingType.SOLID, color: "F8F8F8", fill: "F8F8F8" },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "PHOTO", size: 14, color: "BBBBBB", font: "Calibri" })],
            })],
          })],
        })],
      });

  const rightCol = new DocxTableCell({
    width: { size: convertInchesToTwip(RIGHT_W), type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new ImageRun({ data: qrData, transformation: { width: 80, height: 80 }, type: "png" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        shading: { type: ShadingType.SOLID, color: "002B7D", fill: "002B7D" },
        children: [new TextRun({ text: "SCAN TO RECORD USAGE", size: 12, bold: true, color: "FFFFFF", font: "Calibri" })],
      }),
      photoCell,
    ],
  });

  const leftCol = new DocxTableCell({
    width: { size: convertInchesToTwip(LEFT_W), type: WidthType.DXA },
    borders: noBorder,
    verticalAlign: VerticalAlign.TOP,
    children: [
      // Header: FACILITY INVENTORY CARD
      new Paragraph({
        spacing: { after: 20 },
        shading: { type: ShadingType.SOLID, color: "002B7D", fill: "002B7D" },
        children: [new TextRun({ text: "  FACILITY INVENTORY CARD  ", bold: true, size: 20, color: "FFFFFF", font: "Calibri" })],
      }),
      // Item code badge
      new Paragraph({
        spacing: { after: 20 },
        shading: { type: ShadingType.SOLID, color: "002B7D", fill: "002B7D" },
        children: [new TextRun({ text: `  ${item.item_code}  `, bold: true, size: 22, color: "FFFFFF", font: "Calibri" })],
      }),
      // Item name
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: item.item_name, bold: true, size: 22, font: "Calibri", color: "111111" })],
      }),
      infoRow("Category",  item.category),
      infoRow("Location",  item.location),
      infoRow("Unit",      item.unit),
      infoRow("Min Stock", item.min_stock     != null ? String(item.min_stock)     : null),
      infoRow("Min Order", item.minimum_order != null ? String(item.minimum_order) : null),
      ...(item.spec ? [infoRow("Spec", item.spec)] : []),
    ],
  });

  const innerTable = new DocxTable({
    width: { size: convertInchesToTwip(INNER_W), type: WidthType.DXA },
    rows: [new DocxTableRow({ children: [leftCol, rightCol] })],
  });

  return new DocxTableCell({
    width: { size: convertInchesToTwip(LABEL_W), type: WidthType.DXA },
    borders: thinBorder,
    margins: {
      top: convertInchesToTwip(0.08),
      bottom: convertInchesToTwip(0.08),
      left: convertInchesToTwip(0.08),
      right: convertInchesToTwip(0.08),
    },
    children: [innerTable],
  });
}

function emptyCell(): DocxTableCell {
  return new DocxTableCell({
    width: { size: convertInchesToTwip(LABEL_W), type: WidthType.DXA },
    borders: noBorder,
    children: [new Paragraph({ children: [] })],
  });
}

async function exportToWord(items: Item[]) {
  const rows: DocxTableRow[] = [];

  for (let i = 0; i < items.length; i += 2) {
    const leftCell = await buildWordLabelCell(items[i]);
    const gapCell = new DocxTableCell({
      width: { size: convertInchesToTwip(GAP_W), type: WidthType.DXA },
      borders: noBorder,
      children: [new Paragraph({ children: [] })],
    });
    const rightCell = items[i + 1] ? await buildWordLabelCell(items[i + 1]) : emptyCell();
    rows.push(
      new DocxTableRow({ children: [leftCell, gapCell, rightCell] }),
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
    sections: [{
      properties: {
        page: { margin: { top: convertInchesToTwip(0.5), bottom: convertInchesToTwip(0.5), left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) } },
      },
      children: [
        new DocxTable({
          width: { size: convertInchesToTwip(LABEL_W * 2 + GAP_W), type: WidthType.DXA },
          rows,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "facility_inventory_cards.docx",
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─── Page component ──────────────────────────────────────── */

export function Labels() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: items, isLoading } = useListItems({ search });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [wordExporting, setWordExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

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
    if (displayItems.length > 0 && selectedIds.size === displayItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayItems.map(i => i.id)));
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handlePdfExport = async () => {
    if (!items || selectedIds.size === 0) return;
    setPdfExporting(true);
    try {
      const selected = sortByCategory(items.filter(i => selectedIds.has(i.id)));
      await exportToPDF(selected);
    } finally { setPdfExporting(false); }
  };

  const handleWordExport = async () => {
    if (!items || selectedIds.size === 0) return;
    setWordExporting(true);
    try {
      const selected = sortByCategory(items.filter(i => selectedIds.has(i.id)));
      await exportToWord(selected);
    } finally { setWordExporting(false); }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rack Labels</h1>
          <p className="text-sm text-muted-foreground mt-1">Select items then export to PDF or Word</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePdfExport} disabled={selectedIds.size === 0 || pdfExporting}>
            <Printer className="w-4 h-4 mr-2" />
            {pdfExporting ? "Generating…" : `PDF (${selectedIds.size})`}
          </Button>
          <Button onClick={handleWordExport} disabled={selectedIds.size === 0 || wordExporting}>
            <FileText className="w-4 h-4 mr-2" />
            {wordExporting ? "Generating…" : `Word (${selectedIds.size})`}
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
        <Select value={categoryFilter} onValueChange={val => { setCategoryFilter(val); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        {categoryFilter !== "all" && (
          <button onClick={() => { setCategoryFilter("all"); setSelectedIds(new Set()); }} className="text-sm text-muted-foreground hover:text-foreground underline">
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
            {displayItems.map(item => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => toggleSelect(item.id)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                </TableCell>
                <TableCell className="font-mono font-medium">{item.item_code}</TableCell>
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
