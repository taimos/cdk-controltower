import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AccountInfo, OrgPrincipalAware } from '../aws-org';
import { LogBucketStack } from '../log-buckets';

export interface LogArchiveConfig {
  readonly logArchiveAccount: AccountInfo;
}

export type LogArchiveStageProps = OrgPrincipalAware & LogArchiveConfig & StageProps;

export class LogArchiveStage extends Stage {

  constructor(scope: Construct, props: LogArchiveStageProps) {
    super(scope, 'LogArchive', {
      env: {
        account: props.logArchiveAccount.Id,
        region: props.orgPrincipalEnv.region,
      },
      ...props,
    });

    new LogBucketStack(this, 'log-buckets', {
      env: {
        account: props.logArchiveAccount.Id,
        region: props.orgPrincipalEnv.region,
      },
      orgPrincipalEnv: props.orgPrincipalEnv,
      stackName: 'log-buckets',
    });

  }

}