import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Category, Expense, ExpenseFilter, PaymentMethod } from '../interfaces/expenses.interface';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly http = inject(HttpClient);
  constructor() {}

  getExpenses(filter: ExpenseFilter) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE);
    let params = new HttpParams();
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate as string);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate as string);
    }
    if (Array.isArray(filter.categories)) {
      for (const category of filter.categories) {
        params = params.append('categories', category);
      }
    }
    return this.http.get<Expense[]>(url, { params: params });
  }

  addExpense(payload: Expense) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE);
    return this.http.post<Expense>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }
  updateExpense(payload: Expense) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE);
    return this.http.put<Expense>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }
  deleteExpense(id: string) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE);
    const options = {
      params: new HttpParams().set('id', id),
    };
    return this.http.delete<Expense>(url, options);
  }

  getCategories() {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.CATEGORY.BASE);
    return this.http.get<Category[]>(url);
  }
  addCategory(payload: Category) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.CATEGORY.BASE);
    return this.http.post<Category>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }
  updateCategory(payload: Category) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.CATEGORY.BASE);
    return this.http.put<Category>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }
  deleteCategory(id: string) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.CATEGORY.BASE);
    const options = {
      params: new HttpParams().set('id', id),
    };
    return this.http.delete<Category>(url, options);
  }
  suggestCategoryForExpense(text: string) {
    const url = buildUrl(
      API_ENDPOINTS.EXPENSE.BASE,
      API_ENDPOINTS.EXPENSE.CATEGORY.BASE,
      API_ENDPOINTS.EXPENSE.CATEGORY.SUGGEST
    );
    const options = {
      params: new HttpParams().set('text', text),
    };
    return this.http.get<string>(url, options);
  }

  getPaymentMethods() {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.PAYMENT_METHOD.BASE);
    return this.http.get<PaymentMethod[]>(url);
  }

  updatePaymentMethod(payload: PaymentMethod) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.PAYMENT_METHOD.BASE);
    return this.http.put<PaymentMethod>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }

  addPaymentMethod(payload: PaymentMethod) {
    const url = buildUrl(API_ENDPOINTS.EXPENSE.BASE, API_ENDPOINTS.EXPENSE.PAYMENT_METHOD.BASE);
    return this.http.post<PaymentMethod>(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }
}
