import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateStockMovement, useListItems, useGetItemByCode, getGetItemByCodeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const stockOutSchema = z.object({
  item_id: z.coerce.number().min(1, "Select an item"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  movement_date: z.string().min(1, "Required"),
  reference_no: z.string().optional(),
  department: z.string().optional(),
  requested_by: z.string().optional(),
  issued_by: z.string().optional(),
  purpose: z.string().optional(),
  remarks: z.string().optional(),
});

export function StockOut() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { data: items } = useListItems();
  const createMovement = useCreateStockMovement();

  const searchParams = new URLSearchParams(window.location.search);
  const itemCodeParam = searchParams.get("item_code");

  const { data: scannedItem } = useGetItemByCode(itemCodeParam || "", {
    query: { enabled: !!itemCodeParam, queryKey: getGetItemByCodeQueryKey(itemCodeParam || "") }
  });

  const form = useForm<z.infer<typeof stockOutSchema>>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      item_id: 0,
      quantity: 1,
      movement_date: new Date().toISOString().split('T')[0],
      reference_no: "",
      department: "",
      requested_by: "",
      issued_by: "",
      purpose: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (scannedItem) {
      form.setValue("item_id", scannedItem.id);
    }
  }, [scannedItem, form]);

  const selectedItemId = form.watch("item_id");
  const selectedItem = items?.find(i => i.id === selectedItemId);

  const onSubmit = async (values: z.infer<typeof stockOutSchema>) => {
    if (selectedItem && values.quantity > selectedItem.current_stock) {
      form.setError("quantity", { message: "Quantity exceeds current stock" });
      return;
    }

    try {
      await createMovement.mutateAsync({
        data: {
          ...values,
          movement_type: "OUT",
        }
      });
      toast({ title: "Stock Out recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-movements"] });
      setLocation("/movements");
    } catch (error) {
      toast({ title: "Failed to record Stock Out", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Stock Out</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record Outgoing Stock</CardTitle>
          {itemCodeParam && <CardDescription>Pre-filled from QR Code scan.</CardDescription>}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="item_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item *</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items?.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.item_code} - {item.item_name} ({item.current_stock} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedItem && (
                    <p className="text-sm text-muted-foreground mt-1">Current Stock: {selectedItem.current_stock} {selectedItem.unit}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl><Input {...field} type="number" min="1" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="movement_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="requested_by" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested By</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="issued_by" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued By</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reference_no" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference No. / Work Order</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting} data-testid="button-submit">
                  Record Stock Out
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
