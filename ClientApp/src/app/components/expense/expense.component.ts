import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {ExpenseService} from "../../services/expense.service";
import {MatDialog} from "@angular/material/dialog";
import {Category, Expense, ExpenseChartType, ExpenseFilter, PaymentMethod} from "../../interfaces/expenses.interface";
import {forkJoin} from "rxjs";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MatTableDataSource} from "@angular/material/table";
import dayjs from "dayjs";
import {ExpenseChartComponent} from "../expense-chart/expense-chart.component";
import {MatPaginator} from "@angular/material/paginator";

const EXPENSE_SORT_DATE = (expenseA: Expense, expenseB: Expense) => {
  const dateA = new Date(expenseA.date);
  const dateB = new Date(expenseB.date);
  return dateA.getTime() - dateB.getTime();
}
@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrl: './expense.component.scss'
})
export class ExpenseComponent implements OnInit{
  @ViewChild('paymentMethods', { static: true }) paymentMethodsDialog: TemplateRef<never>;
  @ViewChild('categories', { static: true }) categoriesDialog: TemplateRef<never>;
  @ViewChild('addExpense', { static: true }) addExpenseDialog: TemplateRef<never>;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  private _expenses: Expense[] = [];
  availablePaymentMethods: PaymentMethod[];
  availableCategories: Category[];
  newPaymentMethodValue = '';
  newCategoryValue = '';
  newExpenseForm: FormGroup;
  expenseFilterForm: FormGroup;

  expenseDataSource: MatTableDataSource<Expense> = null;
  displayedColumns = ['description', 'amount', 'category', 'paymentMethod', 'date'];
  constructor(
    private readonly expenseService: ExpenseService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.getExpenses();
    forkJoin([this.expenseService.getCategories(), this.expenseService.getPaymentMethods()]).subscribe(([categories, payments]) => {
      this.availableCategories = categories;
      this.availablePaymentMethods = payments;
    });
  }

  managePaymentMethods() {
    this.dialog.open(this.paymentMethodsDialog, { hasBackdrop: true, disableClose: false, width: '500px'});
  }

  manageCategories() {
    this.dialog.open(this.categoriesDialog, { hasBackdrop: true, disableClose: false, width: '500px'});
  }

  openExpenseForm() {
    this.dialog.open(this.addExpenseDialog, { hasBackdrop: true, disableClose: false, width: '600px'});
  }

  updatePaymentMethod(id: string, value: string, checked: boolean) {
    const payload: PaymentMethod = {
      id: id,
      name: value,
      isActive: checked,
      userId: null
    }
    this.expenseService.updatePaymentMethod(payload).subscribe(result => {
      const index = this.availablePaymentMethods.findIndex(x => x.id === result.id);
      if (index >= 0) {
        this.availablePaymentMethods[index] = result;
      }
    });
  }

  addPaymentMethod() {
    if (!this.newPaymentMethodValue) return;
    const payload: PaymentMethod = {
      id: null,
      name: this.newPaymentMethodValue,
      isActive: true,
      userId: null
    }
    this.expenseService.addPaymentMethod(payload).subscribe(result => {
      this.availablePaymentMethods.push(result);
      this.newPaymentMethodValue = '';
    });
  }

  updateCategory(id: string, value: string) {
    const payload: Category = {
      id: id,
      name: value,
      userId: null
    }
    this.expenseService.updateCategory(payload).subscribe(result => {
      const index = this.availableCategories.findIndex(x => x.id === result.id);
      if (index >= 0) {
        this.availableCategories[index] = result;
      }
    });
  }

  addCustomCategory() {
    if (!this.newCategoryValue) return;
    const payload: Category = {
      id: null,
      name: this.newCategoryValue,
      userId: null
    }
    this.expenseService.addCategory(payload).subscribe(result => {
      this.availableCategories.push(result);
      this.newCategoryValue = '';
    });
  }

  deleteCategory(id: string) {
    this.expenseService.deleteCategory(id).subscribe(() => {
      const index = this.availableCategories.findIndex(x => x.id === id);
      if (index >= 0) {
        this.availableCategories.splice(index, 1);
      }
    })
  }

  addNewExpense() {
    const dateValue = this.newExpenseForm.get('date')?.value;
    const payload: Expense = {
      id: null,
      date: this.formatDate(dateValue),
      amount: this.newExpenseForm.get('amount')?.value,
      categoryId: this.newExpenseForm.get('categoryId')?.value,
      description: this.newExpenseForm.get('description')?.value,
      paymentMethodId: this.newExpenseForm.get('paymentMethodId')?.value,
    }
    this.expenseService.addExpense(payload).subscribe(() => {
      this.newExpenseForm.reset({date: dateValue});
    });
  }

  getExpenses() {
    const payload: ExpenseFilter = {
      startDate: this.formatDate(this.expenseFilterForm.get('startDate')?.value),
      endDate: this.formatDate(this.expenseFilterForm.get('endDate')?.value),
      categories: this.expenseFilterForm.get('categories')?.value,
    }
    this.expenseService.getExpenses(payload).subscribe(result => {
      const expenseData = result.sort(EXPENSE_SORT_DATE);
      this._expenses = expenseData;
      this.expenseDataSource = new MatTableDataSource(expenseData);
      this.expenseDataSource.paginator = this.paginator;
    });
  }



  private initForms() {
    this.newExpenseForm = new FormGroup({
      description: new FormControl<string>('', Validators.required),
      amount: new FormControl<number>(null, Validators.required),
      date: new FormControl<Date>(this.todayDate(), Validators.required),
      categoryId: new FormControl<string>(null, Validators.required),
      paymentMethodId: new FormControl<string>(null, Validators.required),
    });
    const today = this.todayDate();
    const lastMonth = dayjs(today).add(-1, 'month').toDate();
    this.expenseFilterForm = new FormGroup({
      startDate: new FormControl<Date | null>(lastMonth),
      endDate: new FormControl<Date | null>(today),
      categories: new FormControl<string[] | null>(null),
    });
  }

  private todayDate() {
    return this.removeTime(new Date());
  }

  private removeTime(date: Date) {
    return dayjs(date)
      .set('hour', 0)
      .set('minute', 0)
      .set('second', 0)
      .set('millisecond', 0)
      .toDate()
  }

  private formatDate(date: any) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  viewChart(type: ExpenseChartType) {
    const ref = this.dialog.open(ExpenseChartComponent, { hasBackdrop: false, disableClose: true, width: '1000px'});
    ref.componentInstance.expenses = this._expenses;
    ref.componentInstance.chartType = type;
  }
}
