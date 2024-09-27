export interface PaymentMethod {
  id: string;
  name: string;
  isActive:	boolean;
  userId: string;
}

export interface Category {
  id: string;
  name: string;
  emoji?: string;
  userId: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date | string;
  categoryId: string;
  category?: Category;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
}

export interface ExpenseFilter {
  startDate: Date | string,
  endDate: Date | string,
  categories: string[],
}

export type ExpenseChartType = 'category' | 'day' | 'month';
