import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateStockMovement, useListItems } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ItemCombobox } from "@/components/item-combobox";

const stockInSchema = z.object({
  item_id: z.coerce.number().min(1, "Select an item"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  movement_date: z.string().min(1, "Required"),
  reference_no: z.string().optional(),
  supplier: z.string().optional(),
  remarks: z.string().optional(),
});

export function StockIn() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: items } = useListItems();
  const createMovement = useCreateStockMovement();

  const form = useForm<z.infer<typeof stockInSchema>>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      item_id: 0,
      quantity: 1,
      movement_date: new Date().toISOString().split('T')[0],
      reference_no: "",
      supplier: "",
      remarks: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof stockInSchema>) => {
    try {
      await createMovement.mutateAsync({
        data: {
          ...values,
          movement_type: "IN",
        }
      });
      toast({ title: "Stock In recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-movements"] });
      setLocation("/movements");
    } catch (error) {
      toast({ title: "Failed to record Stock In", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Stock In</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record Incoming Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="item_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item *</FormLabel>
                  <FormControl>
                    <ItemCombobox
                      items={items}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search by code, name or category…"
                    />
                  </FormControl>
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
                <FormField control={form.control} name="reference_no" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference / PO No.</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting} data-testid="button-submit">
                  Record Stock In
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
