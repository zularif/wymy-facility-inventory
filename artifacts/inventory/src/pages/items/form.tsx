import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateItem, useUpdateItem, useGetItem, getGetItemQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const itemSchema = z.object({
  item_code: z.string().min(1, "Required"),
  item_name: z.string().min(1, "Required"),
  spec: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "Required"),
  location: z.string().optional(),
  min_stock: z.coerce.number().optional(),
  minimum_order: z.coerce.number().optional(),
  opening_stock: z.coerce.number().optional(),
  photo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export function ItemForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!params.id && params.id !== "new";
  const itemId = Number(params.id);

  const { data: item, isLoading } = useGetItem(itemId, { 
    query: { enabled: isEdit, queryKey: getGetItemQueryKey(itemId) } 
  });

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_code: "",
      item_name: "",
      spec: "",
      category: "",
      unit: "pcs",
      location: "",
      min_stock: 0,
      minimum_order: 0,
      opening_stock: 0,
      photo_url: "",
    },
  });

  useEffect(() => {
    if (item && isEdit) {
      form.reset({
        item_code: item.item_code,
        item_name: item.item_name,
        spec: item.spec || "",
        category: item.category || "",
        unit: item.unit,
        location: item.location || "",
        min_stock: item.min_stock || 0,
        minimum_order: item.minimum_order || 0,
        photo_url: item.photo_url || "",
      });
    }
  }, [item, isEdit, form]);

  const onSubmit = async (values: z.infer<typeof itemSchema>) => {
    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: itemId, data: values });
        toast({ title: "Item updated" });
      } else {
        await createItem.mutateAsync({ data: values });
        toast({ title: "Item created" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setLocation("/items");
    } catch (error) {
      toast({ title: "Failed to save item", variant: "destructive" });
    }
  };

  if (isEdit && isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/items"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Item" : "New Item"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="item_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-code" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="item_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-item-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="spec" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Specification</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Rack</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="photo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URL</FormLabel>
                    <FormControl><Input {...field} type="url" placeholder="https://..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="min_stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level</FormLabel>
                    <FormControl><Input {...field} type="number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minimum_order" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Order Qty</FormLabel>
                    <FormControl><Input {...field} type="number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {!isEdit && (
                  <FormField control={form.control} name="opening_stock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Stock</FormLabel>
                      <FormControl><Input {...field} type="number" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setLocation("/items")}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} data-testid="button-save">
                  {isEdit ? "Update Item" : "Create Item"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
