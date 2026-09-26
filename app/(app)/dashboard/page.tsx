"use client";

import * as React from "react";
import { Copy, Crown, Trash2, TrendingUp } from "lucide-react";
import { useTeam } from "@/components/team-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { deleteConsumption } from "@/lib/data";
import type { Member } from "@/lib/types";

export default function DashboardPage() {
  const { team, members, consumptions, currentMember, refresh } = useTeam();
  const [copied, setCopied] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const spentByMember = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of consumptions) {
      const total = c.beverage.price * c.quantity;
      map.set(c.member_id, (map.get(c.member_id) ?? 0) + total);
    }
    return map;
  }, [consumptions]);

  const stats = React.useMemo(() => {
    return members
      .map((m) => {
        const totalSpent = spentByMember.get(m.id) ?? 0;
        const progress = m.package_price > 0 ? (totalSpent / m.package_price) * 100 : 0;
        return { member: m, totalSpent, progress };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [members, spentByMember]);

  const teamTotalSpent = React.useMemo(
    () => stats.reduce((sum, s) => sum + s.totalSpent, 0),
    [stats]
  );
  const teamTotalPackage = React.useMemo(
    () => stats.reduce((sum, s) => sum + s.member.package_price, 0),
    [stats]
  );
  const teamProgress = teamTotalPackage > 0 ? (teamTotalSpent / teamTotalPackage) * 100 : 0;

  const myStats = stats.find((s) => s.member.id === currentMember.id);

  function copyCode() {
    navigator.clipboard?.writeText(team.join_code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteConsumption(id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <p className="text-xs text-muted-foreground">{members.length} Mitglieder</p>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium"
        >
          {copied ? "Kopiert!" : team.join_code}
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {myStats && <MemberProgressCard stats={myStats} highlight title="Dein Fortschritt" />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Team-Gesamtfortschritt
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ProgressBar progress={teamProgress} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(teamTotalSpent)} von {formatCurrency(teamTotalPackage)}
            </span>
            <BreakEvenBadge progress={teamProgress} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Crown className="h-4 w-4" /> Team-Ranking
        </h2>
        <div className="flex flex-col gap-2">
          {stats.map((s, i) => (
            <MemberProgressCard key={s.member.id} stats={s} rank={i + 1} />
          ))}
        </div>
      </div>

      <div className="pb-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Historie</h2>
        <div className="flex flex-col gap-2">
          {consumptions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Noch keine Buchungen vorhanden.
            </p>
          )}
          {consumptions.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {c.quantity}× {c.beverage.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.member.name} ·{" "}
                    {new Date(c.timestamp).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(c.beverage.price * c.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === c.id}
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const done = progress >= 100;
  return (
    <Progress
      value={Math.min(progress, 100)}
      indicatorClassName={done ? "bg-success" : "bg-primary"}
    />
  );
}

function BreakEvenBadge({ progress }: { progress: number }) {
  return (
    <Badge variant={progress >= 100 ? "success" : "outline"}>
      {Math.round(progress)}%
    </Badge>
  );
}

function MemberProgressCard({
  stats,
  rank,
  highlight,
  title,
}: {
  stats: { member: Member; totalSpent: number; progress: number };
  rank?: number;
  highlight?: boolean;
  title?: string;
}) {
  const { member, totalSpent, progress } = stats;
  const done = progress >= 100;
  const diff = member.package_price - totalSpent;

  return (
    <Card className={highlight ? "border-primary/60 bg-primary/5" : undefined}>
      <CardContent className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rank && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {rank}
              </span>
            )}
            <span className="text-sm font-semibold">{title ?? member.name}</span>
          </div>
          <BreakEvenBadge progress={progress} />
        </div>
        <ProgressBar progress={progress} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatCurrency(totalSpent)} von {formatCurrency(member.package_price)}
          </span>
          <span className={done ? "font-medium text-success" : ""}>
            {done
              ? `Break-Even erreicht! +${formatCurrency(Math.abs(diff))}`
              : `Noch ${formatCurrency(diff)} bis Break-Even`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
