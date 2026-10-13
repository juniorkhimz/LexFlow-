import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <Input className="pl-8" {...props} />
    </div>
  );
}
