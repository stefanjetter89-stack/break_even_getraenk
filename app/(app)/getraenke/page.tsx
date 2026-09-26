"use client";

import * as React from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTeam } from "@/components/team-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { addBeverage, deleteBeverage, updateBeverage } from "@/lib/data";
import type { Beverage } from "@/lib/types";

export default function GetraenkePage() {
  const { team, beverages, refresh } = useTeam();
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("Alle");
  const [editing, setEditing] = React.useState<Beverage | "new" | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const set = new Set(beverages.map((b) => b.category));
    return ["Alle", ...Array.from(set).sort()];
  }, [beverages]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return beverages.filter((b) => {
      const matchesCategory = activeCategory === "Alle" || b.category === activeCategory;
      const matchesSearch = !term || b.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [beverages, activeCategory, search]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteBeverage(id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Getränkeliste</h1>
          <p className="text-xs text-muted-foreground">
            {beverages.length} Getränke in {team.name}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Neu
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Getränk suchen…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 pb-4">
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Keine Getränke gefunden.
          </p>
        )}
        {filtered.map((bev) => (
          <Card key={bev.id}>
            <CardContent className="flex items-center justify-between gap-2 p-3.5">
              <button
                onClick={() => setEditing(bev)}
                className="flex flex-1 flex-col items-start text-left"
              >
                <span className="text-sm font-medium">{bev.name}</span>
                <span className="text-xs text-muted-foreground">{bev.category}</span>
              </button>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(bev.price)}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(bev)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === bev.id}
                  onClick={() => handleDelete(bev.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BeverageDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        target={editing}
        teamId={team.id}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}

function BeverageDialog({
  target,
  teamId,
  onClose,
  onSaved,
}: {
  target: Beverage | "new" | null;
  teamId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isNew = target === "new";
  const existing = isNew ? null : target;
  const [name, setName] = React.useState(existing?.name ?? "");
  const [category, setCategory] = React.useState(existing?.category ?? "");
  const [price, setPrice] = React.useState(existing ? String(existing.price) : "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedPrice = Number(price.replace(",", "."));
    if (!name.trim() || !category.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Bitte füllt alle Felder mit gültigen Werten aus.");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await addBeverage({ teamId, name: name.trim(), category: category.trim(), price: parsedPrice });
      } else if (existing) {
        await updateBeverage(existing.id, {
          name: name.trim(),
          category: category.trim(),
          price: parsedPrice,
        });
      }
      await onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Speichern fehlgeschlagen. Bitte versucht es erneut.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Neues Getränk" : "Getränk bearbeiten"}</DialogTitle>
          <DialogDescription>Gilt nur für euer Team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bevName">Name</Label>
            <Input
              id="bevName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bevCategory">Kategorie</Label>
            <Input
              id="bevCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bevPrice">Preis (€)</Label>
            <Input
              id="bevPrice"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving} className="mt-1">
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
