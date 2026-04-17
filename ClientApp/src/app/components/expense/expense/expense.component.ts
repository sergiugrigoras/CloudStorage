import { Component, inject, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ExpenseService } from '../../../services/expense.service';
import {
  MatDialog,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import {
  Category,
  Expense,
  ExpenseChartType,
  ExpenseFilter,
  PaymentMethod,
} from '../../../interfaces/expenses.interface';
import { EMPTY, forkJoin, Subject, takeUntil } from 'rxjs';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import dayjs from 'dayjs';
import { ExpenseChartComponent } from '../expense-chart/expense-chart.component';
import { MatPaginator } from '@angular/material/paginator';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatFormField,
  MatLabel,
  MatSuffix,
  MatInput,
  MatError,
  MatPrefix,
} from '@angular/material/input';
import {
  MatDateRangeInput,
  MatStartDate,
  MatEndDate,
  MatDatepickerToggle,
  MatDateRangePicker,
  MatDatepickerInput,
  MatDatepicker,
} from '@angular/material/datepicker';
import { MatSelect, MatOption } from '@angular/material/select';
import { TitleCasePipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem, MatMenuContent } from '@angular/material/menu';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/list';

const EXPENSE_SORT_DATE = (expenseA: Expense, expenseB: Expense) => {
  const dateA = new Date(expenseA.date);
  const dateB = new Date(expenseB.date);
  return dateA.getTime() - dateB.getTime();
};
@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrl: './expense.component.scss',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatDateRangeInput,
    MatStartDate,
    MatEndDate,
    MatDatepickerToggle,
    MatSuffix,
    MatDateRangePicker,
    MatSelect,
    MatOption,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatPaginator,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatMenuContent,
    MatDialogTitle,
    MatDialogContent,
    MatInput,
    MatCheckbox,
    MatDivider,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatError,
    MatPrefix,
    MatDatepickerInput,
    MatDatepicker,
    TitleCasePipe,
    CurrencyPipe,
    DatePipe,
  ],
})
export class ExpenseComponent implements OnInit, OnDestroy {
  @ViewChild('paymentMethods', { static: true })
  paymentMethodsTemplateRef: TemplateRef<unknown> | null = null;
  @ViewChild('categories', { static: true }) categoriesTemplateRef: TemplateRef<unknown> | null =
    null;
  @ViewChild('manageExpense', { static: true })
  manageExpenseTemplateRef: TemplateRef<unknown> | null = null;
  @ViewChild('confirmExpenseDelete', { static: true })
  expenseDeleteTemplateRef: TemplateRef<unknown> | null = null;
  @ViewChild(MatPaginator) paginator: MatPaginator | null = null;

  private _expenses: Expense[] = [];
  availablePaymentMethods: PaymentMethod[] = [];
  availableCategories: Category[] = [];
  newPaymentMethodValue = '';
  newCategoryValue = '';

  expenseFormAdd: FormGroup | null = null;
  expenseFormUpdate: FormGroup | null = null;
  expenseFilterForm: FormGroup | null = null;

  expenseDataSource: MatTableDataSource<Expense> | null = null;
  displayedColumns = ['description', 'amount', 'category', 'paymentMethod', 'date'];
  private readonly destroy$ = new Subject<void>();

  private readonly _expenseService = inject(ExpenseService);
  private readonly _dialog = inject(MatDialog);
  private readonly _snackBar = inject(MatSnackBar);
  constructor() {}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.initForms();
    this.getExpenses();
    forkJoin([
      this._expenseService.getCategories(),
      this._expenseService.getPaymentMethods(),
    ]).subscribe(([categories, payments]) => {
      this.availableCategories = categories;
      this.availablePaymentMethods = payments;
    });
  }

  managePaymentMethods() {
    if (this.paymentMethodsTemplateRef == null) return;
    this._dialog.open(this.paymentMethodsTemplateRef, {
      hasBackdrop: true,
      disableClose: false,
      width: '500px',
    });
  }

  manageCategories() {
    if (this.categoriesTemplateRef == null) return;
    this._dialog.open(this.categoriesTemplateRef, {
      hasBackdrop: true,
      disableClose: false,
      width: '500px',
    });
  }

  openExpenseForm(mode: 'add' | 'update') {
    if (this.manageExpenseTemplateRef == null) return;
    this._dialog
      .open(this.manageExpenseTemplateRef, {
        hasBackdrop: true,
        disableClose: true,
        width: '600px',
        data: { mode },
        autoFocus: false,
      })
      .afterClosed()
      .subscribe(() => {
        const dateValue = this.todayDate();
        this.expenseFormAdd?.reset({ date: dateValue });
      });
  }

  updatePaymentMethod(id: string | undefined, value: string, checked: boolean) {
    if (id == null) return;
    const payload: PaymentMethod = {
      id: id,
      name: value,
      isActive: checked,
    };
    this._expenseService.updatePaymentMethod(payload).subscribe((result) => {
      const index = this.availablePaymentMethods.findIndex((x) => x.id === result.id);
      if (index >= 0) {
        this.availablePaymentMethods[index] = result;
      }
    });
  }

  addPaymentMethod() {
    if (!this.newPaymentMethodValue) return;
    const payload: PaymentMethod = {
      name: this.newPaymentMethodValue,
      isActive: true,
    };
    this._expenseService.addPaymentMethod(payload).subscribe((result) => {
      this.availablePaymentMethods.push(result);
      this.newPaymentMethodValue = '';
    });
  }

  updateCategory(id: string | undefined, value: string) {
    if (id == null) return;
    const payload: Category = {
      id: id,
      name: value,
    };
    this._expenseService.updateCategory(payload).subscribe((result) => {
      const index = this.availableCategories.findIndex((x) => x.id === result.id);
      if (index >= 0) {
        this.availableCategories[index] = result;
      }
    });
  }

  addCustomCategory() {
    if (!this.newCategoryValue) return;
    const payload: Category = {
      name: this.newCategoryValue,
    };
    this._expenseService.addCategory(payload).subscribe((result) => {
      this.availableCategories.push(result);
      this.newCategoryValue = '';
    });
  }

  deleteCategory(id: string) {
    this._expenseService.deleteCategory(id).subscribe(() => {
      const index = this.availableCategories.findIndex((x) => x.id === id);
      if (index >= 0) {
        this.availableCategories.splice(index, 1);
      }
    });
  }

  getExpenses() {
    const payload: ExpenseFilter = {
      startDate: this.formatDate(this.expenseFilterForm?.get('startDate')?.value),
      endDate: this.formatDate(this.expenseFilterForm?.get('endDate')?.value),
      categories: this.expenseFilterForm?.get('categories')?.value,
    };
    this._expenseService.getExpenses(payload).subscribe((result) => {
      const expenseData = result.sort(EXPENSE_SORT_DATE);
      this._expenses = expenseData;
      this.expenseDataSource = new MatTableDataSource(expenseData);
      this.expenseDataSource.paginator = this.paginator;
    });
  }

  private initForms() {
    const categoryControl = new FormControl<string | null>(null, Validators.required);
    const descriptionControl = new FormControl<string>('', Validators.required);
    descriptionControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(250),
        switchMap((value) => {
          if (value) {
            return this._expenseService.suggestCategoryForExpense(value);
          }
          return EMPTY;
        }),
        tap((suggestedCategory) => {
          const category = this.availableCategories.find(
            (x) => x.id === suggestedCategory.id?.trim()
          );
          categoryControl.setValue(category?.id ?? null);
        })
      )
      .subscribe();

    // New Expense Form
    this.expenseFormAdd = new FormGroup({
      id: new FormControl<string | null>(null),
      description: descriptionControl,
      amount: new FormControl<number | null>(null, Validators.required),
      date: new FormControl<Date>(this.todayDate(), Validators.required),
      categoryId: categoryControl,
      paymentMethodId: new FormControl<string | null>(null, Validators.required),
    });

    // Update Expense Form
    this.expenseFormUpdate = new FormGroup({
      id: new FormControl<string | null>(null, Validators.required),
      description: new FormControl<string | null>(null, Validators.required),
      amount: new FormControl<number | null>(null, Validators.required),
      date: new FormControl<Date>(this.todayDate(), Validators.required),
      categoryId: new FormControl<string | null>(null, Validators.required),
      paymentMethodId: new FormControl<string | null>(null, Validators.required),
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
      .toDate();
  }

  private formatDate(date: dayjs.ConfigType) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  viewChart(type: ExpenseChartType) {
    const ref = this._dialog.open(ExpenseChartComponent, {
      hasBackdrop: true,
      disableClose: true,
      width: '1000px',
      autoFocus: false,
    });
    ref.componentInstance.expenses = this._expenses;
    ref.componentInstance.chartType = type;
  }

  editExpense(id: unknown) {
    if (typeof id !== 'string') return;
    const expense = this._expenses.find((x) => x.id === id);
    if (expense === undefined || this.expenseFormUpdate == null) return;
    this.expenseFormUpdate.setValue({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      paymentMethodId: expense.paymentMethodId,
      categoryId: expense.categoryId,
    });
    this.openExpenseForm('update');
  }

  deleteExpense(id: unknown) {
    if (typeof id !== 'string') return;
    const expense = this._expenses.find((x) => x.id === id);
    if (expense === undefined || this.expenseDeleteTemplateRef == null) return;
    this._dialog
      .open(this.expenseDeleteTemplateRef, {
        hasBackdrop: true,
        disableClose: false,
        width: '500px',
        data: expense.description,
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this._expenseService.deleteExpense(id);
          }
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.getExpenses();
      });
  }

  getExpenseForm(mode: 'add' | 'update' | undefined) {
    switch (mode) {
      case 'update':
        return this.expenseFormUpdate;
      case 'add':
        return this.expenseFormAdd;
      default:
        return null;
    }
  }

  submitExpenseForm(mode: 'add' | 'update' | undefined) {
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
    };
    if (mode === 'add') {
      this._expenseService.addExpense(payload).subscribe(() => {
        this.expenseFormAdd?.reset({ date: dateValue });
        this._snackBar.open('Success', 'Ok', { duration: 2000 });
        this.getExpenses();
      });
      return;
    }
    if (mode === 'update') {
      this._expenseService.updateExpense(payload).subscribe(() => {
        this.expenseFormAdd?.reset({ date: dateValue });
        this._snackBar.open('Success', 'Ok', { duration: 2000 });
        this.getExpenses();
      });
      return;
    }
  }
}
