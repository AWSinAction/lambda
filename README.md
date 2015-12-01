# AWS in Action: Lambda

The example demonstrates how you can automaically resize images that are upload into a S3 Bucket. Therfore two S3 buckets are created. One that contains the original files and one that contains the resized images.

## Setup

clone this repository

```
$ git clone git@github.com:AWSinAction/lambda.git
$ cd lambda/
```

create an S3 bucket for your Lambda code in the US East (N. Virginia, `us-east-1`) region and upload the `lambda.zip` file (replace `$LambdaS3Bucket` with a S3 bucket name e. g. `lambda-michael`)

```
export AWS_DEFAULT_REGION=us-east-1
$ aws s3 mb s3://$LambdaS3Bucket
$ aws s3 cp lambda.zip s3://$LambdaS3Bucket/lambda.zip
```

create cloudformation stack (replace `$ImageS3Bucket` with a name for your image bucket e. g. `image-michael`, replace `$LambdaS3Bucket` with your Lambda code S3 bucket name)

```
$ aws cloudformation create-stack --stack-name lambda-resize --template-body file://template.json --capabilities CAPABILITY_IAM --parameters ParameterKey=ImageS3Bucket,ParameterValue=$ImageS3Bucket ParameterKey=LambdaS3Bucket,ParameterValue=$LambdaS3Bucket
```

wait until the stack is created (retry if you get `CREATE_IN_PROGRESS` this can take a few minutes)

```
$ aws cloudformation describe-stacks --stack-name lambda-resize --query Stacks[].StackStatus
[
    "CREATE_COMPLETE"
]
```

you can now upload your first image to the original S3 bucket (you can also use the web based Management Console if you prefere)

```
$ aws s3 cp path/to/image.png s3://$ImageS3Bucket-original/image.png
```

you will see the resized images in the resized bucket  (you can also use the web based Management Console if you prefere)

```
$ aws s3 ls s3://$ImageS3Bucket-resized
                           PRE 150x/
                           PRE 50x50/
                           PRE x150/
                           
$ aws s3 ls s3://$ImageS3Bucket-resized/150x/                           
```

as you can see, for every size configuration a new "directory" is created.

## Teardown

remove all files in the original and resized bucket

```
$ aws s3 rm --recursive s3://$ImageS3Bucket-original
$ aws s3 rm --recursive s3://$ImageS3Bucket-resized
```

delete CloudFormation stack

```
$ aws cloudformation delete-stack --stack-name lambda-resize
```

delete Lambda code S3 bucket (replace `$LambdaS3Bucket`)

```
$ aws s3 rb --force s3://$LambdaS3Bucket
```

## Customize the code

If you want to make changes to the code you need to create a new lambda code file (`lambda.zip`) and upload the new zip to S3. Adjust the `config.json` file to adjust the size configuration.

```
$ npm install
$ ./bundle.sh
$ aws s3 cp lambda.zip s3://$LambdaS3Bucket/lambda.zip
```
