import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ControlTowerProps, OrgPrincipalAware } from '../aws-org';
import { BudgetConfig, BudgetStack } from '../budget';
import { CostReportingConfig, CostReportingStack } from '../cur';

export interface BillingStageConfig<T extends string> {
  budgetConfig?: BudgetConfig<T>;
  costReportConfig?: CostReportingConfig;
}

export type BillingStageProps<T extends string> = BillingStageConfig<T> & StageProps & ControlTowerProps<T> & OrgPrincipalAware;

export class BillingStage<T extends string> extends Stage {

  constructor(scope: Construct, props: BillingStageProps<T>) {
    super(scope, 'Billing', {
      env: props.orgPrincipalEnv,
      ...props,
    });

    if (props.budgetConfig) {
      new BudgetStack<T>(this, 'billing-budgets', {
        env: props.orgPrincipalEnv,
        stackName: 'billing-budgets',
        accounts: props.accounts,
        ...props.budgetConfig,
      });
    }
    if (props.costReportConfig) {
      new CostReportingStack(this, 'billing-report', {
        env: props.orgPrincipalEnv,
        stackName: 'billing-report',
        orgPrincipalEnv: props.orgPrincipalEnv,
        ...props.costReportConfig,
      });
    }

  }

}