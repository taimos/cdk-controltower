import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { OrgPrincipalAware } from '../aws-org';
import { SsoPermissionConfig, SsoPermissionStack, SsoProps } from '../sso-permissions';


export interface SsoStageConfig<T extends string> {
  permissionsConfiguration?: SsoPermissionConfig<T>;
}

export type SsoStageProps<T extends string> = SsoStageConfig<T> & SsoProps<T> & StageProps & OrgPrincipalAware;

export class SsoStage<T extends string> extends Stage {

  constructor(scope: Construct, props: SsoStageProps<T>) {
    super(scope, 'SSO', {
      env: props.orgPrincipalEnv,
      ...props,
    });

    if (props.permissionsConfiguration) {
      new SsoPermissionStack<T>(this, 'sso-permissions', {
        env: props.orgPrincipalEnv,
        stackName: 'sso-permissions',
        accounts: props.accounts,
        ssoInstanceArn: props.ssoInstanceArn,
        ...props.permissionsConfiguration,
      });
    }

  }

}