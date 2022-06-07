const { TaimosTypescriptLibrary } = require('@taimos/projen');

const project = new TaimosTypescriptLibrary({
  name: '@taimos/cdk-controltower',
  authorAddress: 'info@taimos.de',
  authorName: 'Taimos GmbH',
  devDeps: [
    '@taimos/projen',
  ],
  deps: [
    'axios',
    'esbuild',
    '@aws-sdk/client-organizations',
    'cdk-iam-floyd@0.376.0', // BREAKING CHANGE IN 377; Only use with CDK >= 2.26
  ],
  repository: 'https://github.com/taimos/cdk-controltower.git',
  defaultReleaseBranch: 'main',
  peerDeps: [
    'aws-cdk-lib@^2.25.0',
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
