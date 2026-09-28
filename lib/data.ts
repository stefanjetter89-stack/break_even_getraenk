import { supabase } from "@/lib/supabase";
import type { Beverage, ConsumptionWithDetails, Member, Team } from "@/lib/types";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createTeam(params: {
  teamName: string;
  defaultPackagePrice: number;
  memberName: string;
}): Promise<{ team: Team; member: Member }> {
  let joinCode = generateJoinCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();
    if (!existing) break;
    joinCode = generateJoinCode();
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: params.teamName,
      join_code: joinCode,
      default_package_price: params.defaultPackagePrice,
    })
    .select()
    .single();

  if (teamError || !team) throw teamError ?? new Error("Team konnte nicht erstellt werden.");

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      team_id: team.id,
      name: params.memberName,
      package_price: params.defaultPackagePrice,
    })
    .select()
    .single();

  if (memberError || !member) throw memberError ?? new Error("Mitglied konnte nicht erstellt werden.");

  const { data: defaults, error: defaultsError } = await supabase
    .from("beverages")
    .select("name, category, price")
    .is("team_id", null);
  if (defaultsError) throw defaultsError;

  if (defaults && defaults.length > 0) {
    const { error: seedError } = await supabase
      .from("beverages")
      .insert(defaults.map((b) => ({ ...b, team_id: team.id })));
    if (seedError) throw seedError;
  }

  return { team, member };
}

export async function joinTeam(params: {
  joinCode: string;
  memberName: string;
  packagePrice: number;
}): Promise<{ team: Team; member: Member }> {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select()
    .eq("join_code", params.joinCode.toUpperCase().trim())
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) throw new Error("Kein Team mit diesem Code gefunden.");

  const name = params.memberName.trim();

  const { data: teamMembers, error: membersError } = await supabase
    .from("members")
    .select()
    .eq("team_id", team.id);
  if (membersError) throw membersError;

  const existing = (teamMembers ?? []).find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    // Gleicher Name im Team = dieselbe Person auf einem weiteren Gerät.
    return { team, member: existing };
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      team_id: team.id,
      name,
      package_price: params.packagePrice,
    })
    .select()
    .single();

  if (memberError || !member) {
    // 23505 = unique_violation (Race Condition: paralleler Join mit gleichem Namen)
    if ((memberError as { code?: string } | null)?.code === "23505") {
      const { data: raceMember, error: raceError } = await supabase
        .from("members")
        .select()
        .eq("team_id", team.id)
        .ilike("name", name)
        .single();
      if (raceError || !raceMember) throw raceError ?? new Error("Mitglied konnte nicht geladen werden.");
      return { team, member: raceMember };
    }
    throw memberError ?? new Error("Mitglied konnte nicht erstellt werden.");
  }

  return { team, member };
}

export async function getTeam(teamId: string): Promise<Team> {
  const { data, error } = await supabase.from("teams").select().eq("id", teamId).single();
  if (error || !data) throw error ?? new Error("Team nicht gefunden.");
  return data;
}

export async function getMembers(teamId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select()
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBeverages(teamId: string): Promise<Beverage[]> {
  const { data, error } = await supabase
    .from("beverages")
    .select()
    .eq("team_id", teamId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addBeverage(params: {
  teamId: string;
  name: string;
  category: string;
  price: number;
}): Promise<Beverage> {
  const { data, error } = await supabase
    .from("beverages")
    .insert({
      team_id: params.teamId,
      name: params.name,
      category: params.category,
      price: params.price,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Getränk konnte nicht angelegt werden.");
  return data;
}

export async function updateBeverage(
  id: string,
  params: { name: string; category: string; price: number }
): Promise<Beverage> {
  const { data, error } = await supabase
    .from("beverages")
    .update(params)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Getränk konnte nicht aktualisiert werden.");
  return data;
}

export async function deleteBeverage(id: string) {
  const { error } = await supabase.from("beverages").delete().eq("id", id);
  if (error) throw error;
}

export async function getConsumptions(memberIds: string[]): Promise<ConsumptionWithDetails[]> {
  if (memberIds.length === 0) return [];
  const { data, error } = await supabase
    .from("consumptions")
    .select(
      "id, member_id, beverage_id, quantity, timestamp, member:members(id, name), beverage:beverages(id, name, price, category)"
    )
    .in("member_id", memberIds)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ConsumptionWithDetails[];
}

export async function addConsumption(params: {
  id?: string;
  memberId: string;
  beverageId: string;
  quantity: number;
  signal?: AbortSignal;
}) {
  // Client-seitige ID + ignoreDuplicates: ein erneuter Sync derselben Buchung ist idempotent.
  let query = supabase.from("consumptions").upsert(
    {
      id: params.id ?? crypto.randomUUID(),
      member_id: params.memberId,
      beverage_id: params.beverageId,
      quantity: params.quantity,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (params.signal) query = query.abortSignal(params.signal);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteConsumption(id: string) {
  const { error } = await supabase.from("consumptions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateMemberPackagePrice(memberId: string, packagePrice: number) {
  const { error } = await supabase
    .from("members")
    .update({ package_price: packagePrice })
    .eq("id", memberId);
  if (error) throw error;
}
