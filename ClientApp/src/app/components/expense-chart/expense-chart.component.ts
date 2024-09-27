import {Component, Inject, TemplateRef, ViewChild} from '@angular/core';
import {Expense, ExpenseChartType} from "../../interfaces/expenses.interface";
import dayjs from "dayjs";
import {ChartConfiguration, ChartOptions} from "chart.js";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";

@Component({
  selector: 'app-expense-chart',
  templateUrl: './expense-chart.component.html',
  styleUrl: './expense-chart.component.scss'
})
export class ExpenseChartComponent {
  @ViewChild('byCategoryChart', { static: true }) byCategoryChartTemplate: TemplateRef<never>;
  @ViewChild('byDayChart', { static: true }) byDayChartTemplate: TemplateRef<never>;
  @ViewChild('byMonthChart', { static: true }) byMonthChartTemplate: TemplateRef<never>;
  pieChartOptions: ChartOptions<'pie'> = {
    scales: {
      x: {
        border: {
          display: false
        },
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      },
      y: {
        border: {
          display: false
        },
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
      },
      tooltip: {
        callbacks: {
          label: context => {
            let currentValue = context.raw as number;
            const meta = context.chart.getDatasetMeta(context.datasetIndex) as any;
            const total = meta.total as number;
            let percentage = parseFloat((currentValue/total*100).toFixed(1));

            return "$" + currentValue.toFixed(2) + ' (' + percentage + '%)';
          }
        }
      }
    }
  };
  byCategoryChartDatasets: any[];
  byCategoryChartLabels: string[];

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: context => {
            let currentValue = context.raw as number
            return context.dataset.label + ": $" + currentValue.toFixed(2);
          }
        }
      }
    }
  };
  byDayChartDatasets: any[];
  byDayChartLabels: string[];

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: context => {
            let currentValue = context.raw as number
            return context.dataset.label + ": $" + currentValue.toFixed(2);
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true
      }
    }
  };
  byMonthChartDatasets: any[];
  byMonthChartLabels: string[];

  template: TemplateRef<any> | null;

  private _expenses: Expense[];
  set expenses(value: Expense[]) {
    this._expenses = value;
    this.setChartData();
  }
  get expenses() {
    return this._expenses;
  }

  set chartType(value: ExpenseChartType) {
    switch (value) {
      case "category": {
        this.template = this.byCategoryChartTemplate
        break;
      }
      case "day": {
        this.template = this.byDayChartTemplate
        break;
      }
      case "month": {
        this.template = this.byMonthChartTemplate
        break;
      }
    }
  }

  private setChartData() {
    this.setChartDataByCategory();
    this.setChartDataByDay();
    this.setChartDataByMonth();
  }

  private setChartDataByCategory() {
    this.byCategoryChartLabels = Array.from(new Set(this.expenses.map(x => x.category.name)));
    const byCategoryAmount = this.byCategoryChartLabels
      .map(category => this.expenses.filter(x => x.category.name === category).reduce((acc, obj) => acc + obj.amount, 0));
    this.byCategoryChartDatasets = [{ data: byCategoryAmount}];
  }

  private setChartDataByDay(byCategory: boolean = false) {
    const dates = Array.from(new Set(this.expenses.map(x => (new Date(x.date).getTime())))).sort((a, b) => a - b);
    const categories = Array.from(new Set(this.expenses.map(x => x.category.name)));
    this.byDayChartLabels = dates.map(x => dayjs(x).format('YYYY-MM-DD'));
    this.byDayChartDatasets = [];
    if (byCategory) {
      for (const category of categories) {
        const byDateAmount = dates
          .map(date => this.expenses.filter(x => (new Date(x.date)).getTime() === date && x.category.name === category).reduce((acc, obj) => acc + obj.amount, 0))
          .map(amount => Number(amount.toFixed(2)));
        this.byDayChartDatasets.push({ data: byDateAmount, label: category });
      }
    } else {
      const byDateAmount = dates
        .map(date => this.expenses.filter(x => (new Date(x.date)).getTime() === date).reduce((acc, obj) => acc + obj.amount, 0))
        .map(amount => Number(amount.toFixed(2)));
      this.byDayChartDatasets.push({ data: byDateAmount, label: 'Total' });
    }

  }

  private setChartDataByMonth(byCategory: boolean = false) {
    const dates = Array.from(new Set(this.expenses.map(x => (new Date(x.date).getTime())))).sort((a, b) => a - b);
    const monthYear: {month: number, year: number}[] = [];
    const categories = Array.from(new Set(this.expenses.map(x => x.category.name)));
    for (const date of dates) {
      const dateObj = dayjs(date);
      const currentMonth = dateObj.get('month');
      const currentYear = dateObj.get('year');
      if (monthYear.find(x => x.month === currentMonth && x.year === currentYear) === undefined) {
        monthYear.push({month: currentMonth, year: currentYear});
      }
    }
    this.byMonthChartLabels = monthYear.map(x => dayjs(new Date(x.year, x.month)).format('MMMM YYYY'));
    this.byMonthChartDatasets = [];
    if (byCategory) {
      for (const category of categories) {
        const byMonthYearAmount = monthYear
          .map(my => this.expenses.filter(e => {
            const date = dayjs(e.date);
            return date.get('month') === my.month && date.get('year') === my.year && e.category.name === category;
          }).reduce((acc, obj) => acc + obj.amount, 0))
          .map(amount => Number(amount.toFixed(2)));

        this.byMonthChartDatasets.push({ data: byMonthYearAmount, label: category });
      }
    } else {
      const byMonthYearAmount = monthYear
        .map(my => this.expenses.filter(e => {
          const date = dayjs(e.date);
          return date.get('month') === my.month && date.get('year') === my.year;
        }).reduce((acc, obj) => acc + obj.amount, 0))
        .map(amount => Number(amount.toFixed(2)));

      this.byMonthChartDatasets.push({ data: byMonthYearAmount, label: 'Total' });
    }

  }

  splitByCategory(value: boolean, chart: ExpenseChartType) {
    if (chart === 'day') {
      this.setChartDataByDay(value);
    }
    if (chart === 'month') {
      this.setChartDataByMonth(value);
    }
  }
}
