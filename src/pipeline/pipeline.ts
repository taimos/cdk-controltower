import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as constructs from 'constructs';
import { OrgPrincipalAware, SsoProps } from '../aws-org';
import { BudgetConfig } from '../budget';
import { CostReportingConfig } from '../cur';
import { SsoPermissionConfig } from '../sso-permissions';
import { BillingStage } from './billing-stage';
import { LogArchiveStage } from './log-archive-stage';
import { SsoStage } from './sso-stage';

export type ControlTowerPipelineProps<T extends string, S extends string> = SsoProps<T, S> & OrgPrincipalAware & StackProps;

export class ControlTowerPipeline<T extends string, S extends string> extends Stack {

  public readonly pipeline: pipelines.CodePipeline;
  public readonly repository: Repository;

  constructor(scope: constructs.Construct, private props: ControlTowerPipelineProps<T, S>) {
    super(scope, 'CDKCT-Pipeline', {
      env: props.env ?? props.orgPrincipalEnv,
      stackName: 'CDKCT-Pipeline',
    });

    this.repository = new Repository(this, 'Repository', {
      repositoryName: 'org-setup',
      description: 'Contains all the code for the AWS organizations setup',
    });

    this.pipeline = new pipelines.CodePipeline(this, 'Resource', {
      publishAssetsInParallel: false,
      crossAccountKeys: true,
      dockerEnabledForSynth: true,
      synth: new pipelines.CodeBuildStep('Synth', {
        input: pipelines.CodePipelineSource.codeCommit(this.repository, 'main'),
        installCommands: [
          'yarn install --frozen-lockfile',
        ],
        commands: [
          'npx projen build',
        ],
      }),
    });
  }

  public addStage(appStage: cdk.Stage, options?: pipelines.AddStageOpts): pipelines.StageDeployment {
    if (!appStage.account || !appStage.region) {
      throw new Error('Stage does not have explicit account or region set up.');
    }
    return this.pipeline.addStage(appStage, options);
  }

  public addSsoConfig(permissionsConfiguration?: SsoPermissionConfig<T, S>) {
    this.addStage(new SsoStage(this, {
      orgPrincipalEnv: this.props.orgPrincipalEnv,
      accounts: this.props.accounts,
      ssoConfig: this.props.ssoConfig,
      permissionsConfiguration,
    }));
  }

  public addBillingConfig(budgetConfig?: BudgetConfig<T>, costReportConfig?: CostReportingConfig) {
    this.addStage(new BillingStage(this, {
      orgPrincipalEnv: this.props.orgPrincipalEnv,
      accounts: this.props.accounts,
      budgetConfig,
      costReportConfig,
    }));
  }

  public addLogArchive(logArchiveAccount: T) {
    this.addStage(new LogArchiveStage(this, {
      orgPrincipalEnv: this.props.orgPrincipalEnv,
      logArchiveAccount: this.props.accounts[logArchiveAccount],
    }));
  }

}