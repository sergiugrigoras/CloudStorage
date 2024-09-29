import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {Category, Expense, ExpenseFilter, PaymentMethod} from "../interfaces/expenses.interface";
const API_URL: string = environment.baseUrl;
const HTTP_OPTIONS = {
  headers: { 'Content-Type': 'application/json' }
}
@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  constructor(private http: HttpClient) { }

  getExpenses(filter: ExpenseFilter) {
    let params = new HttpParams();
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate as string)
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate as string)
    }
    if (Array.isArray(filter.categories)) {
      for (let category of filter.categories) {
        params = params.append('categories', category);
      }
    }
    return this.http.get<Expense[]>(`${API_URL}/api/expense`, {params: params});
  }
  addExpense(payload: Expense) {
    return this.http.post<Expense>(`${API_URL}/api/expense`, payload);
  }
  updateExpense(payload: Expense) {
    return this.http.put<Expense>(`${API_URL}/api/expense`, payload);
  }
  deleteExpense(id: number) {
    return this.http.delete<Expense>(`${API_URL}/api/expense?id=${id}`);
  }

  getCategories() {
    return this.http.get<Category[]>(`${API_URL}/api/category`);
  }
  addCategory(payload: Category) {
    return this.http.post<Category>(API_URL + '/api/category', payload);
  }
  updateCategory(payload: Category) {
    return this.http.put<Category>(API_URL + '/api/category', payload);
  }
  deleteCategory(id: string) {
    return this.http.delete<Category>(API_URL + '/api/category?id=' + id );
  }

  getPaymentMethods() {
    return this.http.get<PaymentMethod[]>(`${API_URL}/api/payment-method`);
  }

  updatePaymentMethod(data: PaymentMethod) {
    return this.http.put<PaymentMethod>(`${API_URL}/api/payment-method`, data, HTTP_OPTIONS);
  }

  addPaymentMethod(data: PaymentMethod) {
    return this.http.post<PaymentMethod>(`${API_URL}/api/payment-method`, data, HTTP_OPTIONS);
  }

  suggestCategoryForExpense(text: string) {
    return this.http.get<string>(`${API_URL}/api/expense/suggest-category?text=${text}`);
  }

}
