import { Account, ListAccountsCommand, ListAccountsCommandOutput, OrganizationsClient } from '@aws-sdk/client-organizations';

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

export async function generateAccountFile(): Promise<string> {
  const client = new OrganizationsClient({ region: 'eu-central-1' });

  const accounts: { [name: string]: Account } = {};
  let NextToken;
  do {
    const res = (await client.send(new ListAccountsCommand({ NextToken })) as ListAccountsCommandOutput);
    res.Accounts?.forEach(account => accounts[account.Name!] = account);
    NextToken = res.NextToken;
  } while (NextToken);

  return `// THIS FILE IS GENERATED; DO NOT MODIFY MANUALLY
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable comma-dangle */
import { AccountList } from '@taimos/cdk-controltower';

export type AccountName = ${Object.keys(accounts).map(name => `'${name}'`).join(' | ')};

export const ACCOUNTS: AccountList<AccountName> = ${JSON.stringify(accounts, null, 2)};
`;
}