import type { UsersRepo, Customer, UserId } from "../types.ts";

export class DbUsersRepo implements UsersRepo {
  constructor(private prisma: any) {}

  async getOrCreate(user_id: UserId, lang: "km" | "en"): Promise<Customer> {
    const now = new Date().toISOString();
    return await this.prisma.customer.upsert({
      where: { user_id },
      update: { lang },
      create: { user_id, created_at: now, lang, confidence_level: 1, lifetime_food_spend_usd: 0, completed_orders: 0 }
    });
  }

  async update(user: Customer): Promise<void> {
    await this.prisma.customer.upsert({ where: { user_id: user.user_id }, update: user, create: user });
  }
}
