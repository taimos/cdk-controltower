import { Group, IdentitystoreClient, ListGroupsCommand, ListGroupsCommandOutput } from '@aws-sdk/client-identitystore';
import { Account, ListAccountsCommand, ListAccountsCommandOutput, OrganizationsClient } from '@aws-sdk/client-organizations';
import { ListInstancesCommand, SSOAdminClient } from '@aws-sdk/client-sso-admin';
import { Environment } from 'aws-cdk-lib';

export interface AccountInfo {
  readonly Id: string;
  readonly Name: string;
  readonly Email: string;
  readonly Arn: string;
  readonly JoinedMethod: string;
  readonly JoinedTimestamp: string;
  readonly Status: string;
}

export type AccountList<T extends string> = { [name in T]: AccountInfo };
export type AccountConfig<T extends string, V> = { [name in T]?: V };
export type GroupConfig<T extends string, V> = { [name in T]?: V };

export interface GroupInfo {
  readonly GroupId: string;
  readonly DisplayName: string;
  readonly ExternalIds?: { Issuer: string; Id: string }[];
  readonly Description?: string;
}
export type GroupList<T extends string> = { [name in T]: GroupInfo };

export interface SsoConfig<T extends string> {
  readonly instanceArn: string;
  readonly identityStoreId: string;
  readonly groups: GroupList<T>;
}

/**
 *
 */
export interface OrgPrincipalAware {
  /**
   * The organization principal account
   */
  readonly orgPrincipalEnv: Environment;
}

/**
 * Properties of a cdk-controltower stack stack
 *
 * @param T - the AccountName type of the generated account list
 */
export interface ControlTowerProps<T extends string> {
  /**
   * The list of AWS accounts. Can be generated by running `npx fetch-accounts`
   */
  readonly accounts: AccountList<T>;
}

/**
 * Properties of the SSO stack
 *
 * @param T - the AccountName type of the generated account list
 * @param S - the GroupName type of the generated sso config
 */
export interface SsoProps<T extends string, S extends string> extends ControlTowerProps<T> {
  /**
   * The configuration of the AWS SSO org. Can be generated by running `npx fetch-sso-config`
   */
  readonly ssoConfig: SsoConfig<S>;
}

export async function generateAccountFile(): Promise<string> {
  const client = new OrganizationsClient({ region: 'eu-central-1' });

  const accounts: { [name: string]: Account } = {};
  let NextToken;

  // Loop through all AWS accounts in the organization
  do {
    // Get the list of accounts from AWS Organizations API
    const res = (await client.send(new ListAccountsCommand({ NextToken })) as ListAccountsCommandOutput);

    // Store the returned accounts in the `accounts` object
    res.Accounts?.forEach(account => accounts[account.Name!] = account);
    NextToken = res.NextToken;
  } while (NextToken);

  // Sort the accounts by name
  const orderedAccounts = Object.keys(accounts).sort().reduce(
    (obj, key) => {
      obj[key] = accounts[key];
      return obj;
    },
    {} as { [name: string]: Account },
  );

  // Return the generated file as a string
  return `// THIS FILE IS GENERATED; DO NOT MODIFY MANUALLY
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable comma-dangle */
import { AccountList } from '@taimos/cdk-controltower';

/** Type that represents the possible account names */
export type AccountName = ${Object.keys(orderedAccounts).map(name => `'${name}'`).join(' | ')};

/** Object that contains all the AWS accounts in the organization */
export const ACCOUNTS: AccountList<AccountName> = ${JSON.stringify(orderedAccounts, null, 2)};
`;
}

export async function generateSsoConfigFile(): Promise<string> {
  const idClient = new IdentitystoreClient({});
  const ssoClient = new SSOAdminClient({});

  // retrieve a list of SSO instances
  const instances = await ssoClient.send(new ListInstancesCommand({}));

  // check if there's only one instance of SSO, throw an error if there's more or less
  if (instances.Instances?.length !== 1) {
    throw new Error('Cannot find unique SSO instance');
  }
  // store the first (and only) instance in the 'ssoInstance' variable
  const ssoInstance = instances.Instances[0];

  const groups: { [name: string]: Group } = {};
  let NextToken;

  // keep retrieving the groups until there are no more
  do {
    // retrieve a list of groups using the IdentityStoreId of the SSO instance
    const res = (await idClient.send(new ListGroupsCommand({ IdentityStoreId: ssoInstance.IdentityStoreId!, NextToken })) as ListGroupsCommandOutput);

    // add each group to the 'groups' object, using the display name as the key and removing the 'IdentityStoreId' property from each group
    res.Groups?.forEach(grp => {
      delete grp.IdentityStoreId;
      groups[grp.DisplayName!] = grp;
    });

    NextToken = res.NextToken;
  } while (NextToken);

  // sort the group names and create an object where the keys are sorted group names and the values are the corresponding groups
  const orderedGroups = Object.keys(groups).sort().reduce(
    (obj, key) => {
      obj[key] = groups[key];
      return obj;
    },
    {} as { [name: string]: Group },
  );

  // return the generated file content as a string, including comments and import statements
  return `// THIS FILE IS GENERATED; DO NOT MODIFY MANUALLY
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable comma-dangle */
import { GroupList, SsoConfig } from '@taimos/cdk-controltower';

/** type for the group names, using a union of string literals */
export type GroupName = ${Object.keys(orderedGroups).map(name => `'${name}'`).join(' | ')};

/** object literal that maps group names to their corresponding group details */
export const GROUPS: GroupList<GroupName> = ${JSON.stringify(orderedGroups, null, 2)};

/** object literal that represents the SSO configuration, including the instance ARN, identity store ID, and groups */
export const SSO_CONFIG: SsoConfig<GroupName> = {
  instanceArn: '${ssoInstance.InstanceArn}',
  identityStoreId: '${ssoInstance.IdentityStoreId}',
  groups: GROUPS,
};
`;
}