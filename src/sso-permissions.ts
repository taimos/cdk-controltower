import {
  aws_sso as sso,
  IResolvable,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AccountPermission } from './account-permission-sfn';
import { AccountConfig, ControlTowerProps } from './aws-org';

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

/**
 * Properties of the SSO stack
 *
 * @param T - the AccountName type of the generated account list
 */
export interface SsoProps<T extends string> extends ControlTowerProps<T> {
  /**
   * The ARN of the SSO instance
   */
  readonly ssoInstanceArn: string;
}

export interface SsoPermissionConfig<T extends string> {/**
   * Assignments of groups to AWS accounts and permission sets
   *
   * Specify here who has which access to what.
   * ```
   *{
   *  'MyAccount Name': {
   *    'myGroupId': ['Admin'],
   *  }
   *}
   * ```
   */
  readonly groupPermissions: AccountConfig<T, { [groupId: string]: string[] }>;
  /**
   * optional configuration options for the Admin permission set
   *
   * @default `AdministratorAccess` with 8 hours session duration
   */
  readonly adminSetOptions?: PermissionSetOptions;
  /**
   * optional configuration options for the ReadOnly permission set
   *
   * @default `ReadOnlyAccess` with 8 hours session duration
   */
  readonly readOnlySetOptions?: PermissionSetOptions;
  /**
   * optional configuration options for the Admin permission set
   *
   * @default `ReadOnlyAccess` and `job-function/Billing` with 8 hours session duration
   */
  readonly billingSetOptions?: PermissionSetOptions;
  /**
   * add more permission sets here besides Admin, Billing, and ReadOnly
   */
  readonly permissionSets?: { [name: string]: PermissionSetOptions };
  /**
   * Collection of group - permission set assignments for every new account
   *
   * Use this to grant your admins permissions for every account directly after creation
   */
  readonly defaultAssignmentsForNewAccount?: {
    readonly groupId: string;
    readonly permissionSetName: string;
  }[];
}

export type SsoPermissionStackProps<T extends string> = SsoProps<T> & SsoPermissionConfig<T> & StackProps;

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