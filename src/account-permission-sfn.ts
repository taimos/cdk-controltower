import {
  aws_events,
  aws_events_targets as targets,
  aws_sso as sso,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/*
This is a code written in AWS Cloud Development Kit (CDK) using TypeScript.
The code creates an AWS Step Functions state machine, which consists of a
series of steps for associating AWS Single Sign-On (SSO) permission sets
with AWS accounts. The state machine is triggered by the creation of a new
managed account in AWS Control Tower.

It exports the AccountPermission class that creates the Step Functions state
machine, and the AddAssociationTask class that defines each step in the state
machine. The AddAssociationTask class extends the tasks.CallAwsService class,
which calls the AWS SSO Admin API's createAccountAssignment action.

The AccountPermission class takes the SSO instance ARN, and an array of default
assignments in its properties, which include group ID, permission set name, and
the permission set. It then creates an instance of the AddAssociationTask class
for each default assignment and chains them together to form the state machine.
Finally, it creates an AWS Event rule that triggers the state machine whenever
a new managed account is created in AWS Control Tower.
*/

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
