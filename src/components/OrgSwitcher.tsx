import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useOrgScope } from "@/context/OrgScopeContext";
import { cn } from "@/lib/utils";

const SCOPED_ROUTES = [
  "/sso",
  "/instructions",
  "/llm-providers",
  "/llm-assignments",
];

export function OrgSwitcher() {
  const location = useLocation();
  const { activeOrg, availableOrgs, setActiveOrgId, isPinned, canSwitch } =
    useOrgScope();
  const [open, setOpen] = useState(false);

  const isScopedRoute = SCOPED_ROUTES.some((r) =>
    location.pathname.startsWith(r),
  );
  if (!isScopedRoute) return null;
  if (!activeOrg) return null;

  if (isPinned || !canSwitch) {
    return (
      <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
        <Building2 className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{activeOrg.name}</span>
      </Badge>
    );
  }

  const internal = availableOrgs.filter((o) => o.group === "internal");
  const customers = availableOrgs.filter((o) => o.group === "customers");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8"
          role="combobox"
          aria-expanded={open}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium max-w-[180px] truncate">
            {activeOrg.name}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search organizations…" />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            {internal.length > 0 && (
              <CommandGroup heading="Internal">
                {internal.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      setActiveOrgId(org.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeOrg.id === org.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {org.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {internal.length > 0 && customers.length > 0 && (
              <CommandSeparator />
            )}
            {customers.length > 0 && (
              <CommandGroup heading="Customers">
                {customers.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      setActiveOrgId(org.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        activeOrg.id === org.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {org.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
