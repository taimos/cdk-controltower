import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { OrgPrincipalAware, SsoProps } from '../aws-org';
import { SsoPermissionConfig, SsoPermissionStack } from '../sso-permissions';


export interface SsoStageConfig<T extends string, S extends string> {
  permissionsConfiguration?: SsoPermissionConfig<T, S>;
}

export type SsoStageProps<T extends string, S extends string> = SsoStageConfig<T, S> & SsoProps<T, S> & StageProps & OrgPrincipalAware;

export class SsoStage<T extends string, S extends string> extends Stage {

  constructor(scope: Construct, props: SsoStageProps<T, S>) {
    super(scope, 'SSO', {
      env: props.orgPrincipalEnv,
      ...props,
    });

    if (props.permissionsConfiguration) {
      new SsoPermissionStack<T, S>(this, 'sso-permissions', {
        env: props.orgPrincipalEnv,
        stackName: 'sso-permissions',
        accounts: props.accounts,
        ssoConfig: props.ssoConfig,
        ...props.permissionsConfiguration,
      });
    }

  }

}