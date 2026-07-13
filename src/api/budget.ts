import client from './client';

export type BudgetToday = {
  has_budget: boolean;
  budget: number;
  spent: number;
  remaining: number;
  monthly_savings: number;
};

export type BudgetSetupPayload = {
  total_amount: number;
  total_days: number;
  household_size: number;
  daily_fare?: number;
  daily_allowance?: number;
};

export async function fetchBudgetToday(): Promise<BudgetToday> {
  const { data } = await client.get('/budget/today');
  return data;
}

export async function setupBudget(payload: BudgetSetupPayload) {
  const { data } = await client.post('/budget/setup', payload);
  return data;
}

export async function logExpense(actual_spent: number, notes?: string) {
  const { data } = await client.post('/budget/log', { actual_spent, notes });
  return data;
}
