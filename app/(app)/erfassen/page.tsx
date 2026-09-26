"use client";

import * as React from "react";
import { Check, ChevronDown, Minus, Plus, Search } from "lucide-react";
import { useTeam } from "@/components/team-provider";
import { Input } from "@/components/ui/input";
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
import { addConsumption } from "@/lib/data";
import type { Beverage } from "@/lib/types";

export default function ErfassenPage() {
  const { members, beverages, activeMemberId, setActiveMemberId, refresh } = useTeam();
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("Alle");
  const [selectedBeverage, setSelectedBeverage] = React.useState<Beverage | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const set = new Set(beverages.map((b) => b.category));
    return ["Alle", ...Array.from(set)];
  }, [beverages]);

  const filteredBeverages = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return beverages.filter((b) => {
      const matchesCategory = activeCategory === "Alle" || b.category === activeCategory;
      const matchesSearch = !term || b.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [beverages, activeCategory, search]);

  const activeMember = members.find((m) => m.id === activeMemberId);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function handleConfirm(quantity: number) {
    if (!selectedBeverage || !activeMember) return;
    await addConsumption({
      memberId: activeMember.id,
      beverageId: selectedBeverage.id,
      quantity,
    });
    setSelectedBeverage(null);
    showToast(`${quantity}× ${selectedBeverage.name} für ${activeMember.name} gebucht`);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Trinkt für</p>
          <button
            onClick={() => setMemberPickerOpen(true)}
            className="flex items-center gap-1.5 text-lg font-semibold"
          >
            {activeMember?.name ?? "…"}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
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
        {filteredBeverages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Keine Getränke gefunden.
          </p>
        )}
        {filteredBeverages.map((bev) => (
          <button key={bev.id} onClick={() => setSelectedBeverage(bev)} className="text-left">
            <Card className="transition-colors hover:border-primary/50 active:bg-accent">
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{bev.name}</span>
                  <span className="text-xs text-muted-foreground">{bev.category}</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(bev.price)}
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <QuantityDialog
        beverage={selectedBeverage}
        onClose={() => setSelectedBeverage(null)}
        onConfirm={handleConfirm}
      />

      <MemberPickerDialog
        open={memberPickerOpen}
        onOpenChange={setMemberPickerOpen}
        members={members}
        activeMemberId={activeMemberId}
        onSelect={(id) => {
          setActiveMemberId(id);
          setMemberPickerOpen(false);
        }}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-sm font-medium text-success shadow-lg">
            <Check className="h-4 w-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function QuantityDialog({
  beverage,
  onClose,
  onConfirm,
}: {
  beverage: Beverage | null;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
}) {
  return (
    <Dialog open={!!beverage} onOpenChange={(open) => !open && onClose()}>
      {beverage && (
        <QuantityDialogContent key={beverage.id} beverage={beverage} onConfirm={onConfirm} />
      )}
    </Dialog>
  );
}

function QuantityDialogContent({
  beverage,
  onConfirm,
}: {
  beverage: Beverage;
  onConfirm: (quantity: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = React.useState(1);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onConfirm(quantity);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{beverage.name}</DialogTitle>
        <DialogDescription>
          {beverage.category} · {formatCurrency(beverage.price)} / Stück
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-center gap-6 py-4">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <span className="w-12 text-center text-3xl font-bold">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setQuantity((q) => Math.min(20, q + 1))}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Gesamt: {formatCurrency(beverage.price * quantity)}
      </p>
      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Speichern…" : "Buchen"}
      </Button>
    </DialogContent>
  );
}

function MemberPickerDialog({
  open,
  onOpenChange,
  members,
  activeMemberId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: { id: string; name: string }[];
  activeMemberId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Für wen buchst du?</DialogTitle>
          <DialogDescription>Wechsle schnell zwischen Teammitgliedern.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                "flex items-center justify-between rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                m.id === activeMemberId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary"
              )}
            >
              {m.name}
              {m.id === activeMemberId && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
