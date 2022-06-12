const { TaimosTypescriptLibrary } = require('@taimos/projen');

const project = new TaimosTypescriptLibrary({
  name: '@taimos/cdk-controltower',
  authorAddress: 'info@taimos.de',
  authorName: 'Taimos GmbH',
  majorVersion: 1,
  devDeps: [
    '@taimos/projen',
  ],
  deps: [
    'axios',
    'esbuild',
    '@aws-sdk/client-organizations',
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
  },
});

project.synth();
