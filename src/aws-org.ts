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
  do {
    const res = (await client.send(new ListAccountsCommand({ NextToken })) as ListAccountsCommandOutput);
    res.Accounts?.forEach(account => accounts[account.Name!] = account);
    NextToken = res.NextToken;
  } while (NextToken);

  const orderedAccounts = Object.keys(accounts).sort().reduce(
    (obj, key) => {
      obj[key] = accounts[key];
      return obj;
    },
    {} as { [name: string]: Account },
  );

  return `// THIS FILE IS GENERATED; DO NOT MODIFY MANUALLY
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable comma-dangle */
import { AccountList } from '@taimos/cdk-controltower';

export type AccountName = ${Object.keys(orderedAccounts).map(name => `'${name}'`).join(' | ')};

export const ACCOUNTS: AccountList<AccountName> = ${JSON.stringify(orderedAccounts, null, 2)};
`;
}

export async function generateSsoConfigFile(): Promise<string> {
  const idClient = new IdentitystoreClient({});
  const ssoClient = new SSOAdminClient({});

  const instances = await ssoClient.send(new ListInstancesCommand({}));
  if (instances.Instances?.length !== 1) {
    throw new Error('Cannot find unique SSO instance');
  }
  const ssoInstance = instances.Instances[0];

  const groups: { [name: string]: Group } = {};
  let NextToken;
  do {
    const res = (await idClient.send(new ListGroupsCommand({ IdentityStoreId: ssoInstance.IdentityStoreId!, NextToken })) as ListGroupsCommandOutput);
    res.Groups?.forEach(grp => {
      delete grp.IdentityStoreId;
      groups[grp.DisplayName!] = grp;
    });
    NextToken = res.NextToken;
  } while (NextToken);

  const orderedGroups = Object.keys(groups).sort().reduce(
    (obj, key) => {
      obj[key] = groups[key];
      return obj;
    },
    {} as { [name: string]: Group },
  );

  return `// THIS FILE IS GENERATED; DO NOT MODIFY MANUALLY
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable comma-dangle */
import { GroupList, SsoConfig } from '@taimos/cdk-controltower';

export type GroupName = ${Object.keys(orderedGroups).map(name => `'${name}'`).join(' | ')};

export const GROUPS: GroupList<GroupName> = ${JSON.stringify(orderedGroups, null, 2)};

export const SSO_CONFIG: SsoConfig<GroupName> = {
  instanceArn: '${ssoInstance.InstanceArn}',
  identityStoreId: '${ssoInstance.IdentityStoreId}',
  groups: GROUPS,
};
`;
}