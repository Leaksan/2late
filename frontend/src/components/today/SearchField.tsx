import { Input } from "@/components/ui/input";

export function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      className="mt-4 h-11"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Rechercher une annonce…"
      type="search"
      aria-label="Rechercher dans la file"
    />
  );
}
