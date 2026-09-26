export interface Team {
  id: string;
  name: string;
  join_code: string;
  default_package_price: number;
  created_at: string;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  package_price: number;
  created_at: string;
}

export interface Beverage {
  id: string;
  name: string;
  category: string;
  price: number;
  created_at: string;
}

export interface Consumption {
  id: string;
  member_id: string;
  beverage_id: string;
  quantity: number;
  timestamp: string;
}

export interface ConsumptionWithDetails extends Consumption {
  member: Pick<Member, "id" | "name">;
  beverage: Pick<Beverage, "id" | "name" | "price" | "category">;
}

export interface MemberStats {
  member: Member;
  totalSpent: number;
  progress: number;
}
