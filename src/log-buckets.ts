import {
  aws_iam as iam,
  aws_kms as kms,
  aws_s3 as s3,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface LogBucketStackProps extends StackProps {
  readonly orgAccountId: string;
}

export class LogBucketStack extends Stack {

  public readonly flowLogsBucketName: string;

  constructor(scope: Construct, id: string, props: LogBucketStackProps) {
    super(scope, id, props);

    const encryptionKey = new kms.Key(this, 'FlowLogsKey', {
      enableKeyRotation: false,
      alias: 'vpc-flow-logs',
    });
    encryptionKey.grantEncryptDecrypt(new iam.ServicePrincipal('delivery.logs.amazonaws.com'));

    this.flowLogsBucketName = `${props.orgAccountId}-vpc-flow-logs`;
    const flowLogsBucket = new s3.Bucket(this, 'FlowLogs', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryptionKey,
      bucketName: this.flowLogsBucketName,
    });
    flowLogsBucket.grantReadWrite(new iam.ServicePrincipal('delivery.logs.amazonaws.com'));

  }
}