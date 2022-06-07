import {
  aws_sso as sso,
  IResolvable,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AccountPermission } from './account-permission-sfn';
import { AccountList } from './aws-org';

export interface PermissionSetOptions {
  /**
     * The description of the `PermissionSet` .
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sso-permissionset.html#cfn-sso-permissionset-description
     */
  readonly description?: string;
  /**
   * The IAM inline policy that is attached to the permission set.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sso-permissionset.html#cfn-sso-permissionset-inlinepolicy
   */
  readonly inlinePolicy?: any | IResolvable;
  /**
   * A structure that stores the details of the IAM managed policy.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sso-permissionset.html#cfn-sso-permissionset-managedpolicies
   */
  readonly managedPolicies?: string[];
  /**
   * The length of time that the application user sessions are valid for in the ISO-8601 standard.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sso-permissionset.html#cfn-sso-permissionset-sessionduration
   */
  readonly sessionDuration?: string;
}

export interface SsoPermissionStackProps<T extends string> extends StackProps {
  readonly ssoInstanceArn: string;
  readonly accounts: AccountList<T>;
  readonly groupPermissions: { [name in T]?: { [groupId: string]: string[] } };
  readonly adminSetOptions?: PermissionSetOptions;
  readonly readOnlySetOptions?: PermissionSetOptions;
  readonly billingSetOptions?: PermissionSetOptions;
  readonly permissionSets?: { [name: string]: PermissionSetOptions };
  readonly defaultAssignmentsForNewAccount?: {
    readonly groupId: string;
    readonly permissionSetName: string;
  }[];
}

export class SsoPermissionStack<T extends string> extends Stack {

  private permissionSets: { [name: string]: sso.CfnPermissionSet } = {};

  constructor(scope: Construct, id: string, props: SsoPermissionStackProps<T>) {
    super(scope, id, props);

    const adminPermissionSet = new sso.CfnPermissionSet(this, 'AdminSet', {
      instanceArn: props.ssoInstanceArn,
      name: 'AdminAccess',
      description: props.adminSetOptions?.description ?? 'Grant administrative access',
      inlinePolicy: props.adminSetOptions?.inlinePolicy,
      managedPolicies: props.adminSetOptions?.managedPolicies ?? [
        'arn:aws:iam::aws:policy/AdministratorAccess',
      ],
      sessionDuration: props.adminSetOptions?.sessionDuration ?? 'PT8H',
    });
    this.permissionSets.Admin = adminPermissionSet;

    const readOnlyPermissionSet = new sso.CfnPermissionSet(this, 'ReadOnlySet', {
      instanceArn: props.ssoInstanceArn,
      name: 'ReadOnlyAccess',
      description: props.readOnlySetOptions?.description ?? 'Grant read-only access',
      inlinePolicy: props.readOnlySetOptions?.inlinePolicy,
      managedPolicies: props.readOnlySetOptions?.managedPolicies ?? [
        'arn:aws:iam::aws:policy/ReadOnlyAccess',
      ],
      sessionDuration: props.readOnlySetOptions?.sessionDuration ?? 'PT8H',
    });
    this.permissionSets.ReadOnly = readOnlyPermissionSet;

    const billingPermissionSet = new sso.CfnPermissionSet(this, 'BillingSet', {
      instanceArn: props.ssoInstanceArn,
      name: 'BillingAccess',
      description: props.billingSetOptions?.description ?? 'Grant read-only and billing access',
      inlinePolicy: props.billingSetOptions?.inlinePolicy,
      managedPolicies: props.billingSetOptions?.managedPolicies ?? [
        'arn:aws:iam::aws:policy/job-function/Billing',
        'arn:aws:iam::aws:policy/ReadOnlyAccess',
      ],
      sessionDuration: props.billingSetOptions?.sessionDuration ?? 'PT8H',
    });
    this.permissionSets.Billing = billingPermissionSet;

    for (const permSetName of Object.keys(props.permissionSets ?? {})) {
      const permSetOptions = props.permissionSets![permSetName];
      this.permissionSets[permSetName] = new sso.CfnPermissionSet(this, `${permSetName}Set`, {
        instanceArn: props.ssoInstanceArn,
        name: `${permSetName}Access`,
        description: permSetOptions?.description,
        inlinePolicy: permSetOptions?.inlinePolicy,
        managedPolicies: permSetOptions?.managedPolicies,
        sessionDuration: permSetOptions?.sessionDuration ?? 'PT8H',
      });
    }

    for (const accountName of Object.keys(props.groupPermissions)) {
      const account = props.accounts[accountName as T];
      for (const groupId of Object.keys(props.groupPermissions[accountName as T]!)) {
        for (const perm of props.groupPermissions[accountName as T]![groupId]) {
          const permSet = this.permissionSets[perm];
          if (!permSet) {
            throw new Error('Invalid permission set type found: ' + perm);
          }

          new sso.CfnAssignment(this, `Assignment-${account.Id}-${groupId}-${perm}Access`, {
            instanceArn: props.ssoInstanceArn,
            permissionSetArn: permSet.attrPermissionSetArn,
            targetType: 'AWS_ACCOUNT',
            targetId: account.Id,
            principalType: 'GROUP',
            principalId: groupId,
          });
        }
      }
    }

    if (props.defaultAssignmentsForNewAccount) {
      new AccountPermission(this, 'AccountCreationWorkflow', {
        ssoInstanceArn: props.ssoInstanceArn,
        defaultAssignments: props.defaultAssignmentsForNewAccount.map(a => ({
          groupId: a.groupId,
          permissionSetName: a.permissionSetName,
          permissionSet: this.permissionSets[a.permissionSetName],
        })),
      });
    }

  }

}