const { TaimosTypescriptLibrary } = require('@taimos/projen');
const { UpgradeDependenciesSchedule } = require('projen/lib/javascript');

const project = new TaimosTypescriptLibrary({
  name: '@taimos/cdk-controltower',
  authorAddress: 'info@taimos.de',
  authorName: 'Taimos GmbH',
  majorVersion: 1,
  depsUpgradeOptions: { workflowOptions: { schedule: UpgradeDependenciesSchedule.WEEKLY } },
  devDeps: [
    '@taimos/projen',
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
  peerDeps: [
    'aws-cdk-lib@^2.26.0',
    'constructs@^10.0.0',
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
  tsconfig: {
    compilerOptions: {
      skipLibCheck: true,
    },
  },
});

project.synth();
