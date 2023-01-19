import {
  aws_events,
  aws_events_targets as targets,
  aws_sso as sso,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AccountPermissionProps {
  readonly ssoInstanceArn: string;
  readonly defaultAssignments: {
    readonly groupId: string;
    readonly permissionSetName: string;
    readonly permissionSet: sso.CfnPermissionSet;
  }[];
}

export class AccountPermission extends Construct {

  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AccountPermissionProps) {
    super(scope, id);

    const firstAssignment = props.defaultAssignments[0];

    let definition: sfn.IChainable & sfn.INextable = new AddAssociationTask(this, `Assign${firstAssignment.groupId}${firstAssignment.permissionSetName}`, {
      ssoInstanceArn: props.ssoInstanceArn,
      groupId: firstAssignment.groupId,
      permissionSetArn: firstAssignment.permissionSet.attrPermissionSetArn,
    });

    for (let index = 1; index < props.defaultAssignments.length; index++) {
      const assign = props.defaultAssignments[index];
      definition = definition.next(new AddAssociationTask(this, `Assign${assign.groupId}${assign.permissionSetName}`, {
        ssoInstanceArn: props.ssoInstanceArn,
        groupId: assign.groupId,
        permissionSetArn: assign.permissionSet.attrPermissionSetArn,
      }));
    }
    this.stateMachine = new sfn.StateMachine(this, 'Resource', { definition });

    new aws_events.Rule(this, 'AccountCreationRule', {
      eventPattern: {
        source: ['aws.controltower'],
        detailType: ['AWS Service Event via CloudTrail'],
        detail: {
          eventName: ['CreateManagedAccount'],
        },
      },
      targets: [
        new targets.SfnStateMachine(this.stateMachine),
      ],
    });
  }

}

interface AddAssociationTaskProps {
  readonly ssoInstanceArn: string;
  readonly groupId: string;
  readonly permissionSetArn: string;
  readonly accountIdSource?: string;
  readonly resultPath?: string;
}

class AddAssociationTask extends tasks.CallAwsService {
  constructor(scope: Construct, id: string, props: AddAssociationTaskProps) {
    super(scope, id, {
      service: 'ssoadmin',
      action: 'createAccountAssignment',
      iamResources: ['*'],
      iamAction: 'sso:CreateAccountAssignment',
      parameters: {
        'InstanceArn': props.ssoInstanceArn,
        'PermissionSetArn': props.permissionSetArn,
        'TargetType': 'AWS_ACCOUNT',
        'TargetId.$': props.accountIdSource ?? '$.detail.serviceEventDetails.createManagedAccountStatus.account.accountId',
        'PrincipalType': 'GROUP',
        'PrincipalId': props.groupId,
      },
      resultPath: props.resultPath ?? `$.${id}`,
    });
    this.addRetry();
  }
}
