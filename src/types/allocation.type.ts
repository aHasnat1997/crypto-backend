export interface TAllocationData {
  name: string;
  current_balance: number;
  history: Array<{
    minuteKey: string;
    starting_balance: number;
    minute_gain: number;
    minute_gain_percent: number;
    ending_balance: number;
    notes: string;
    createdAt: string;
  }>;
}

export type TAllocationCreate = {
  date: string;
  key: string;
  name: string;
  initialBalance: number;
}
