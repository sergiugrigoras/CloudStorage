import {Component, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {ExpenseService} from "../../services/expense.service";
import {MatDialog} from "@angular/material/dialog";
import {Category, Expense, ExpenseChartType, ExpenseFilter, PaymentMethod} from "../../interfaces/expenses.interface";
import {EMPTY, forkJoin, Subject, takeUntil} from "rxjs";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MatTableDataSource} from "@angular/material/table";
import dayjs from "dayjs";
import {ExpenseChartComponent} from "../expense-chart/expense-chart.component";
import {MatPaginator} from "@angular/material/paginator";
import {debounceTime, switchMap, tap} from "rxjs/operators";
import {MatSnackBar} from "@angular/material/snack-bar";

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
export class ExpenseComponent implements OnInit, OnDestroy {
  @ViewChild('paymentMethods', { static: true }) paymentMethodsTemplateRef: TemplateRef<never>;
  @ViewChild('categories', { static: true }) categoriesTemplateRef: TemplateRef<never>;
  @ViewChild('manageExpense', { static: true }) manageExpenseTemplateRef: TemplateRef<never>;
  @ViewChild('confirmExpenseDelete', { static: true }) expenseDeleteTemplateRef: TemplateRef<never>;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  private _expenses: Expense[] = [];
  availablePaymentMethods: PaymentMethod[];
  availableCategories: Category[];
  newPaymentMethodValue = '';
  newCategoryValue = '';

  addExpenseForm: FormGroup;
  updateExpenseForm: FormGroup;
  expenseFilterForm: FormGroup;

  expenseDataSource: MatTableDataSource<Expense> = null;
  displayedColumns = ['description', 'amount', 'category', 'paymentMethod', 'date'];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly expenseService: ExpenseService,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
  ) {}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.initForms();
    this.getExpenses();
    forkJoin([this.expenseService.getCategories(), this.expenseService.getPaymentMethods()]).subscribe(([categories, payments]) => {
      this.availableCategories = categories;
      this.availablePaymentMethods = payments;
    });
  }

  managePaymentMethods() {
    this.dialog.open(this.paymentMethodsTemplateRef, { hasBackdrop: true, disableClose: false, width: '500px'});
  }

  manageCategories() {
    this.dialog.open(this.categoriesTemplateRef, { hasBackdrop: true, disableClose: false, width: '500px'});
  }

  openExpenseForm(mode: 'add' | 'update') {
    this.dialog.open(this.manageExpenseTemplateRef, {
      hasBackdrop: true,
      disableClose: true,
      width: '600px',
      data: {mode}
    })
      .afterClosed()
      .subscribe(() => {
        const dateValue = this.todayDate()
        this.addExpenseForm.reset({date: dateValue});
      });
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
    const categoryControl = new FormControl<string>(null, Validators.required);
    const descriptionControl = new FormControl<string>('', Validators.required);
    descriptionControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(250),
      switchMap(value => {
        if (value) {
          return this.expenseService.suggestCategoryForExpense(value)
        }
        return EMPTY;
      }),
      tap(categoryId => {
        const category = this.availableCategories.find(x => x.id === categoryId?.trim());
        categoryControl.setValue(category?.id);
      })
    ).subscribe();

    // New Expense Form
    this.addExpenseForm = new FormGroup({
      id: new FormControl<string>(null),
      description: descriptionControl,
      amount: new FormControl<number>(null, Validators.required),
      date: new FormControl<Date>(this.todayDate(), Validators.required),
      categoryId: categoryControl,
      paymentMethodId: new FormControl<string>(null, Validators.required),
    });

    // Update Expense Form
    this.updateExpenseForm = new FormGroup({
      id: new FormControl<string>(null, Validators.required),
      description: new FormControl<string>(null, Validators.required),
      amount: new FormControl<number>(null, Validators.required),
      date: new FormControl<Date>(this.todayDate(), Validators.required),
      categoryId: new FormControl<string>(null, Validators.required),
      paymentMethodId: new FormControl<string>(null, Validators.required),
    });

    // Expense Filter Form
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

  editExpense(id: any) {
    if(typeof id !== 'string') return;
    const expense = this._expenses.find(x => x.id === id);
    if (expense === undefined) return;
    this.updateExpenseForm.setValue({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      paymentMethodId: expense.paymentMethodId,
      categoryId: expense.categoryId,
    });
    this.openExpenseForm('update');
  }


  deleteExpense(id: any) {
    if(typeof id !== 'string') return;
    const expense = this._expenses.find(x => x.id === id);
    if (expense === undefined) return;
    this.dialog.open(this.expenseDeleteTemplateRef, {
      hasBackdrop: true,
      disableClose: false,
      width: '500px',
      data: expense.description
    }).afterClosed()
      .pipe(
        switchMap(dialogResult => {
          if (dialogResult) {
            return this.expenseService.deleteExpense(id);
          }
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.getExpenses();
      });
  }

  getExpenseForm(mode: 'add' | 'update') {
    switch (mode) {
      case 'update': {
        return this.updateExpenseForm;
      }
      case 'add': {
        return this.addExpenseForm;
      }
      default: {
        return null;
      }
    }
  }

  submitExpenseForm(mode: 'add' | 'update') {
    const form = this.getExpenseForm(mode);
    if (form === null) return;

    const dateValue = form.get('date')?.value;
    const payload: Expense = {
      id: form.get('id')?.value,
      date: this.formatDate(dateValue),
      amount: form.get('amount')?.value,
      categoryId: form.get('categoryId')?.value,
      description: form.get('description')?.value,
      paymentMethodId: form.get('paymentMethodId')?.value,
    }
    if (mode === 'add') {
      this.expenseService.addExpense(payload).subscribe(() => {
        this.addExpenseForm.reset({date: dateValue});
        this._snackBar.open('Success', 'Ok', { duration: 2000 });
        this.getExpenses();
      });
      return;
    }
    if (mode === 'update') {
      this.expenseService.updateExpense(payload).subscribe(() => {
        this.addExpenseForm.reset({date: dateValue});
        this._snackBar.open('Success', 'Ok', { duration: 2000 });
        this.getExpenses();
      });
      return;
    }
  }
}
