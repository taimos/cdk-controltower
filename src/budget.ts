import {
  aws_budgets as budgets,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AccountConfig, ControlTowerProps } from './aws-org';

export interface BudgetConfig<T extends string> {
  readonly budgets: AccountConfig<T, number>;
}

export type BudgetStackProps<T extends string> = BudgetConfig<T> & StackProps & ControlTowerProps<T>;

export class BudgetStack<T extends string> extends Stack {
  constructor(scope: Construct, id: string, props: BudgetStackProps<T>) {
    super(scope, id, props);

    for (const accountName of Object.keys(props.budgets)) {
      const account = props.accounts[accountName as T];
      new budgets.CfnBudget(this, `Budget${account.Name}`, {
        budget: {
          budgetType: 'COST',
          budgetLimit: {
            unit: 'USD',
            amount: props.budgets[accountName as T]!,
          },
          timeUnit: 'MONTHLY',
          costFilters: {
            LinkedAccount: [account.Id],
          },
          costTypes: {
            includeCredit: true,
            includeDiscount: true,
            includeOtherSubscription: true,
            includeRecurring: true,
            includeRefund: true,
            includeSubscription: true,
            includeSupport: true,
            includeTax: false,
            includeUpfront: true,
            useAmortized: false,
            useBlended: false,
          },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              notificationType: 'ACTUAL',
              comparisonOperator: 'GREATER_THAN',
              threshold: 90,
            },
            subscribers: [
              {
                subscriptionType: 'EMAIL',
                address: account.Email,
              },
            ],
          }, {
            notification: {
              notificationType: 'FORECASTED',
              comparisonOperator: 'GREATER_THAN',
              threshold: 100,
            },
            subscribers: [
              {
                subscriptionType: 'EMAIL',
                address: account.Email,
              },
            ],
          },
        ],
      });
    }

  }
}
