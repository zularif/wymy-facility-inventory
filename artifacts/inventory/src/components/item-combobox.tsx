import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Item = {
  id: number;
  item_code: string;
  item_name: string;
  category?: string | null;
  current_stock?: number;
  unit?: string | null;
};

interface ItemComboboxProps {
  items: Item[] | undefined;
  value: number;
  onChange: (id: number) => void;
  showStock?: boolean;
  placeholder?: string;
}

export function ItemCombobox({
  items,
  value,
  onChange,
  showStock = false,
  placeholder = "Search by code, name or category…",
}: ItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => items?.find((i) => i.id === value),
    [items, value]
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items.filter(
      (i) =>
        i.item_code.toLowerCase().includes(q) ||
        i.item_name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    ).slice(0, 50);
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      const cat = item.category ?? "Uncategorised";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected
            ? `${selected.item_code} — ${selected.item_name}`
            : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {filtered.length === 0 && (
              <CommandEmpty>No items found.</CommandEmpty>
            )}
            {Array.from(grouped.entries()).map(([category, catItems]) => (
              <CommandGroup key={category} heading={category}>
                {catItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => {
                      onChange(item.id);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium mr-1">{item.item_code}</span>
                    <span className="text-muted-foreground truncate flex-1">{item.item_name}</span>
                    {showStock && (
                      <span className="ml-2 text-xs text-muted-foreground shrink-0">
                        {item.current_stock ?? 0} {item.unit ?? ""}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
