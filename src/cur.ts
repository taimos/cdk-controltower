import {
  aws_cur as cur,
  aws_iam as iam,
  aws_s3 as s3,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import * as st from 'cdk-iam-floyd';
import { Construct } from 'constructs';

export interface CostReportingStackProps extends StackProps {
  /**
   * Name of the Cost and Usage report S3 bucket
   */
  readonly costReportBucketName: string;
  /**
   * Name of the Cost and Usage report
   *
   * @default `default-cur`
   */
  readonly costReportName?: string;
}

export class CostReportingStack extends Stack {
  constructor(scope: Construct, id: string, props: CostReportingStackProps) {
    super(scope, id, props);

    const globalCURAccountId = '386209384616';

    const curBucket = new s3.Bucket(this, 'CurBucket', {
      bucketName: props.costReportBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });
    curBucket.grantPut(new iam.AccountPrincipal(globalCURAccountId));
    curBucket.addToResourcePolicy(
      new st.S3().allow().toGetBucketAcl().toGetBucketPolicy().onBucket(curBucket.bucketName).forAccount(globalCURAccountId),
    );

    new cur.CfnReportDefinition(this, 'CurDefinition', {
      compression: 'GZIP',
      format: 'textORcsv',
      refreshClosedReports: false,
      reportName: props.costReportName ?? 'default-cur',
      reportVersioning: 'CREATE_NEW_REPORT',
      s3Bucket: curBucket.bucketName,
      s3Prefix: 'reports',
      s3Region: 'us-east-1',
      timeUnit: 'HOURLY',
      additionalSchemaElements: ['RESOURCES'],
    });

  }
}
