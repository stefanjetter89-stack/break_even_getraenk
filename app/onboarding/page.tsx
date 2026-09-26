"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Beer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTeam, joinTeam } from "@/lib/data";
import { setSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Beer className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">AIDA Break-Even</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Trackt eure ALL IN Getränkepauschale im Team und seht live, wann sich das Paket lohnt.
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full max-w-sm">
        <TabsList className="w-full">
          <TabsTrigger value="create">Team erstellen</TabsTrigger>
          <TabsTrigger value="join">Team beitreten</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <CreateTeamForm />
        </TabsContent>
        <TabsContent value="join">
          <JoinTeamForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateTeamForm() {
  const router = useRouter();
  const [teamName, setTeamName] = React.useState("");
  const [memberName, setMemberName] = React.useState("");
  const [packagePrice, setPackagePrice] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(packagePrice.replace(",", "."));
    if (!teamName.trim() || !memberName.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Bitte füllt alle Felder mit gültigen Werten aus.");
      return;
    }
    setLoading(true);
    try {
      const { team, member } = await createTeam({
        teamName: teamName.trim(),
        defaultPackagePrice: price,
        memberName: memberName.trim(),
      });
      setSession({ teamId: team.id, memberId: member.id });
      router.push("/erfassen");
    } catch (err) {
      console.error(err);
      setError("Team konnte nicht erstellt werden. Bitte versucht es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Neues Team gründen</CardTitle>
        <CardDescription>Du wirst automatisch das erste Mitglied.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="teamName">Teamname</Label>
            <Input
              id="teamName"
              placeholder="z. B. Kabine 8042"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="packagePrice">Standard-Paketpreis (€)</Label>
            <Input
              id="packagePrice"
              inputMode="decimal"
              placeholder="z. B. 89.90"
              value={packagePrice}
              onChange={(e) => setPackagePrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memberName">Dein Name</Label>
            <Input
              id="memberName"
              placeholder="z. B. Stefan"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={40}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Wird erstellt…" : "Team erstellen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function JoinTeamForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = React.useState("");
  const [memberName, setMemberName] = React.useState("");
  const [packagePrice, setPackagePrice] = React.useState("");
  const [priceTouched, setPriceTouched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const code = joinCode.trim();
    if (code.length !== 6 || priceTouched) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("teams")
          .select("default_package_price")
          .eq("join_code", code.toUpperCase())
          .maybeSingle();
        if (!cancelled && data) {
          setPackagePrice(String(data.default_package_price));
        }
      } catch {
        // ignore prefill errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [joinCode, priceTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(packagePrice.replace(",", "."));
    if (!joinCode.trim() || !memberName.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Bitte füllt alle Felder mit gültigen Werten aus.");
      return;
    }
    setLoading(true);
    try {
      const { team, member } = await joinTeam({
        joinCode: joinCode.trim(),
        memberName: memberName.trim(),
        packagePrice: price,
      });
      setSession({ teamId: team.id, memberId: member.id });
      router.push("/erfassen");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Beitritt fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Team beitreten</CardTitle>
        <CardDescription>Gib den 6-stelligen Code eures Teams ein.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="joinCode">Join-Code</Label>
            <Input
              id="joinCode"
              placeholder="z. B. AB12CD"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="tracking-widest"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="joinMemberName">Dein Name</Label>
            <Input
              id="joinMemberName"
              placeholder="z. B. Julia"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="joinPackagePrice">Dein Paketpreis (€)</Label>
            <Input
              id="joinPackagePrice"
              inputMode="decimal"
              placeholder="wird vom Team übernommen"
              value={packagePrice}
              onChange={(e) => {
                setPriceTouched(true);
                setPackagePrice(e.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Wird automatisch mit dem Standardpreis des Teams befüllt, kann aber angepasst werden.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Trete bei…" : "Team beitreten"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
