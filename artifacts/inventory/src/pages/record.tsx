import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateStockMovement, useListItems,
  useGetItemByCode, getGetItemByCodeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { ItemCombobox } from "@/components/item-combobox";
import { useAuth } from "@/lib/auth";
import { ArrowDownToLine, ArrowUpFromLine, QrCode } from "lucide-react";

/* ── schemas ── */
const outSchema = z.object({
  item_id:       z.coerce.number().min(1, "Select an item"),
  quantity:      z.coerce.number().min(1, "Quantity must be at least 1"),
  movement_date: z.string().min(1, "Required"),
  requested_by:  z.string().optional(),
  purpose:       z.string().optional(),
  remarks:       z.string().optional(),
});

const inSchema = z.object({
  item_id:       z.coerce.number().min(1, "Select an item"),
  quantity:      z.coerce.number().min(1, "Quantity must be at least 1"),
  movement_date: z.string().min(1, "Required"),
  reference_no:  z.string().optional(),
  supplier:      z.string().optional(),
  remarks:       z.string().optional(),
});

const today = new Date().toISOString().split("T")[0];

/* ── Stock Out form ── */
function OutForm({ itemCodeParam }: { itemCodeParam: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: items } = useListItems();
  const createMovement = useCreateStockMovement();

  const { data: scannedItem } = useGetItemByCode(itemCodeParam || "", {
    query: { enabled: !!itemCodeParam, queryKey: getGetItemByCodeQueryKey(itemCodeParam || "") },
  });

  const form = useForm<z.infer<typeof outSchema>>({
    resolver: zodResolver(outSchema),
    defaultValues: { item_id: 0, quantity: 1, movement_date: today, requested_by: "", purpose: "", remarks: "" },
  });

  useEffect(() => { if (scannedItem) form.setValue("item_id", scannedItem.id); }, [scannedItem, form]);

  const selectedItem = items?.find(i => i.id === form.watch("item_id"));

  const onSubmit = async (values: z.infer<typeof outSchema>) => {
    if (selectedItem && values.quantity > selectedItem.current_stock) {
      form.setError("quantity", { message: "Quantity exceeds current stock" });
      return;
    }
    try {
      await createMovement.mutateAsync({ data: { ...values, movement_type: "OUT" } });
      toast({ title: "Stock Out recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-movements"] });
      setLocation("/movements");
    } catch {
      toast({ title: "Failed to record Stock Out", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="item_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Item *</FormLabel>
            <FormControl>
              <ItemCombobox items={items} value={field.value} onChange={field.onChange} showStock placeholder="Search by code, name or category…" />
            </FormControl>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">Current Stock: <span className="font-semibold">{selectedItem.current_stock} {selectedItem.unit}</span></p>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input {...field} type="number" min="1" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="movement_date" render={({ field }) => (
            <FormItem><FormLabel>Date *</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="requested_by" render={({ field }) => (
            <FormItem><FormLabel>Requested By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="purpose" render={({ field }) => (
            <FormItem><FormLabel>Purpose</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="remarks" render={({ field }) => (
          <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting} className="bg-orange-500 hover:bg-orange-600">
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Record Stock Out
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ── Stock In form ── */
function InForm({ itemCodeParam }: { itemCodeParam: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: items } = useListItems();
  const createMovement = useCreateStockMovement();

  const { data: scannedItem } = useGetItemByCode(itemCodeParam || "", {
    query: { enabled: !!itemCodeParam, queryKey: getGetItemByCodeQueryKey(itemCodeParam || "") },
  });

  const form = useForm<z.infer<typeof inSchema>>({
    resolver: zodResolver(inSchema),
    defaultValues: { item_id: 0, quantity: 1, movement_date: today, reference_no: "", supplier: "", remarks: "" },
  });

  useEffect(() => { if (scannedItem) form.setValue("item_id", scannedItem.id); }, [scannedItem, form]);

  const onSubmit = async (values: z.infer<typeof inSchema>) => {
    try {
      await createMovement.mutateAsync({ data: { ...values, movement_type: "IN" } });
      toast({ title: "Stock In recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-movements"] });
      setLocation("/movements");
    } catch {
      toast({ title: "Failed to record Stock In", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="item_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Item *</FormLabel>
            <FormControl>
              <ItemCombobox items={items} value={field.value} onChange={field.onChange} placeholder="Search by code, name or category…" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input {...field} type="number" min="1" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="movement_date" render={({ field }) => (
            <FormItem><FormLabel>Date *</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="reference_no" render={({ field }) => (
            <FormItem><FormLabel>Reference / PO No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="supplier" render={({ field }) => (
            <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="remarks" render={({ field }) => (
          <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting} className="bg-green-600 hover:bg-green-700">
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Record Stock In
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ── Main page ── */
export function RecordUsage() {
  const { profile } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const itemCodeParam = params.get("item_code");
  const typeParam = params.get("type");

  const canStockIn = profile?.role !== "technician";
  const [type, setType] = useState<"IN" | "OUT">(
    !canStockIn ? "OUT" : typeParam === "in" ? "IN" : "OUT"
  );

  const { data: scannedItem } = useGetItemByCode(itemCodeParam || "", {
    query: { enabled: !!itemCodeParam, queryKey: getGetItemByCodeQueryKey(itemCodeParam || "") },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <QrCode className="w-7 h-7 text-blue-600" />
          Record Usage
        </h1>
        {itemCodeParam && (
          <p className="text-sm text-muted-foreground mt-1">
            Pre-filled from QR code scan — item <span className="font-mono font-semibold">{itemCodeParam}</span>
          </p>
        )}
      </div>

      {/* Scanned item info */}
      {scannedItem && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
          <Badge className="font-mono bg-blue-600 hover:bg-blue-700">{scannedItem.item_code}</Badge>
          <div>
            <p className="font-semibold text-sm">{scannedItem.item_name}</p>
            <p className="text-xs text-muted-foreground">Current Stock: {scannedItem.current_stock} {scannedItem.unit}</p>
          </div>
        </div>
      )}

      {/* Type toggle */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setType("OUT")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            type === "OUT"
              ? "bg-orange-500 text-white"
              : "bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" /> Stock Out
        </button>
        {canStockIn && (
          <button
            type="button"
            onClick={() => setType("IN")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              type === "IN"
                ? "bg-green-600 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Stock In
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{type === "OUT" ? "Record Outgoing Stock" : "Record Incoming Stock"}</CardTitle>
          {itemCodeParam && <CardDescription>Item pre-filled from QR scan. Verify before submitting.</CardDescription>}
        </CardHeader>
        <CardContent>
          {type === "OUT"
            ? <OutForm key="out" itemCodeParam={itemCodeParam} />
            : <InForm key="in" itemCodeParam={itemCodeParam} />
          }
        </CardContent>
      </Card>
    </div>
  );
}
