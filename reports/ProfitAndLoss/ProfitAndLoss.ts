import { t } from 'fyo';
import {
  AccountRootType,
  AccountRootTypeEnum,
} from 'models/baseModels/Account/types';
import {
  AccountReport,
  convertAccountRootNodeToAccountList,
} from 'reports/AccountReport';
import {
  AccountListNode,
  AccountTreeNode,
  ReportData,
  ValueMap,
} from 'reports/types';

export class ProfitAndLoss extends AccountReport {
  static title = t`Profit And Loss`;
  static reportName = 'profit-and-loss';
  loading = false;

  get rootTypes(): AccountRootType[] {
    return [AccountRootTypeEnum.Income, AccountRootTypeEnum.Expense];
  }

  async setReportData(filter?: string, force?: boolean) {
    this.loading = true;
    if (force || filter !== 'hideGroupAmounts') {
      await this._setRawData();
    }

    const map = this._getGroupedMap(true, 'account');
    const rangeGroupedMap = await this._getGroupedByDateRanges(map);
    const accountTree = await this._getAccountTree(rangeGroupedMap);

    for (const name of Object.keys(accountTree)) {
      const { rootType } = accountTree[name];
      if (this.rootTypes.includes(rootType)) {
        continue;
      }

      delete accountTree[name];
    }

    /**
     * Income Rows
     */
    const incomeRoot = this.getRootNode(
      AccountRootTypeEnum.Income,
      accountTree
    )!;
    const incomeList = convertAccountRootNodeToAccountList(incomeRoot);
    const incomeRows = this.getReportRowsFromAccountList(incomeList);

    /**
     * Expense Rows
     */
    const expenseRoot = this.getRootNode(
      AccountRootTypeEnum.Expense,
      accountTree
    )!;
    const expenseList = convertAccountRootNodeToAccountList(expenseRoot);
    const expenseRows = this.getReportRowsFromAccountList(expenseList);

    this.reportData = this.getReportDataFromRows(
      incomeRows,
      expenseRows,
      incomeRoot,
      expenseRoot
    );
    this.loading = false;
  }

  getReportDataFromRows(
    incomeRows: ReportData,
    expenseRows: ReportData,
    incomeRoot: AccountTreeNode | undefined,
    expenseRoot: AccountTreeNode | undefined
  ): ReportData {
    if (incomeRoot && !expenseRoot) {
      return this.getIncomeOrExpenseRows(
        incomeRoot,
        incomeRows,
        t`Total Income (Credit)`
      );
    }

    if (expenseRoot && !incomeRoot) {
      return this.getIncomeOrExpenseRows(
        expenseRoot,
        expenseRows,
        t`Total Income (Credit)`
      );
    }

    if (!incomeRoot || !expenseRoot) {
      return [];
    }

    return this.getIncomeAndExpenseRows(
      incomeRows,
      expenseRows,
      incomeRoot,
      expenseRoot
    );
  }

  getIncomeOrExpenseRows(
    root: AccountTreeNode,
    rows: ReportData,
    totalRowName: string
  ): ReportData {
    const total = this.getTotalNode(root, totalRowName);
    const totalRow = this.getRowFromAccountListNode(total);

    return [rows, totalRow].flat();
  }

  getIncomeAndExpenseRows(
    incomeRows: ReportData,
    expenseRows: ReportData,
    incomeRoot: AccountTreeNode,
    expenseRoot: AccountTreeNode
  ) {
    const totalIncome = this.getTotalNode(incomeRoot, t`Total Income (Credit)`);
    const totalIncomeRow = this.getRowFromAccountListNode(totalIncome);

    const totalExpense = this.getTotalNode(
      expenseRoot,
      t`Total Expense (Debit)`
    );
    const totalExpenseRow = this.getRowFromAccountListNode(totalExpense);

    const totalValueMap: ValueMap = new Map();
    for (const key of totalIncome.valueMap!.keys()) {
      const income = totalIncome.valueMap!.get(key)?.balance ?? 0;
      const expense = totalExpense.valueMap!.get(key)?.balance ?? 0;
      totalValueMap.set(key, { balance: income - expense });
    }

    const totalProfit = {
      name: t`Total Profit`,
      valueMap: totalValueMap,
      level: 0,
    } as AccountListNode;

    const totalProfitRow = this.getRowFromAccountListNode(totalProfit);
    totalProfitRow.cells.forEach((c) => {
      c.bold = true;
      if (typeof c.rawValue !== 'number') {
        return;
      }

      if (c.rawValue > 0) {
        c.color = 'green';
      } else if (c.rawValue < 0) {
        c.color = 'red';
      }
    });

    const emptyRow = this.getEmptyRow();

    return [
      incomeRows,
      totalIncomeRow,
      emptyRow,
      expenseRows,
      totalExpenseRow,
      emptyRow,
      totalProfitRow,
    ].flat() as ReportData;
  }
}
