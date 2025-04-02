const { typescript, javascript, github } = require('projen');

const project = new typescript.TypeScriptProject({
  name: '@taimos/cdk-controltower',
  authorName: 'Taimos GmbH',
  authorEmail: 'info@taimos.de',
  authorOrganization: true,
  authorUrl: 'https://taimos.de',
  copyrightOwner: 'Taimos GmbH',
  copyrightPeriod: '2024',
  license: 'Apache-2.0',
  licensed: true,
  stability: 'experimental',
  docgen: true,
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
      skipLibCheck: true,
    },
  },
  releaseToNpm: true,
  npmAccess: javascript.NpmAccess.PUBLIC,
  autoApproveUpgrades: true,
  autoApproveOptions: { allowedUsernames: ['hoegertn', 'taimos-projen[bot]'], secret: 'GITHUB_TOKEN' },
  depsUpgradeOptions: { workflowOptions: { schedule: javascript.UpgradeDependenciesSchedule.WEEKLY } },
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp(),
  },
  pullRequestTemplateContents: [`* **Please check if the PR fulfills these requirements**
- [ ] The commit message describes your change
- [ ] Tests for the changes have been added if possible (for bug fixes / features)
- [ ] Docs have been added / updated (for bug fixes / features)


* **What kind of change does this PR introduce?** (Bug fix, feature, docs update, ...)



* **What is the current behavior?** (You can also link to an open issue here)



* **What is the new behavior (if this is a feature change)?**



* **Does this PR introduce a breaking change?** (What changes might users need to make in their setup due to this PR?)



* **Other information**:`],

  majorVersion: 1,
  devDeps: [
    'ts-node',
  ],
  deps: [
    'axios',
    'esbuild',
    '@aws-sdk/client-organizations',
    '@aws-sdk/client-identitystore',
    '@aws-sdk/client-sso-admin',
    'cdk-iam-floyd',
  ],
  repository: 'https://github.com/taimos/cdk-controltower.git',
  defaultReleaseBranch: 'main',
  packageManager: javascript.NodePackageManager.NPM,
  peerDeps: [
    'aws-cdk-lib@^2.187.0',
    'constructs@^10.3.0',
  ],
  keywords: [
    'cdk',
    'organizations',
    'controltower',
  ],
  bin: {
    'fetch-accounts': 'lib/fetch-accounts.js',
    'fetch-sso-config': 'lib/fetch-sso-config.js',
  },
});

project.synth();
