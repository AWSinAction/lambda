# AWS in Action: Lambda

This repository demonstrates how you can create a bunch of resized images right after uploading an image to S3. The solution requires no servers, is scalable and can be automatically deployed within minutes. The following figure demonstrate the image resizing process.

![Image resizing process](./lambda_resize.png?raw=true "Image resizing process")

The solution makes use of two S3 buckets:

* The bucket that contains the original images. Users upload images to this bucket. This bucket is suffixed with `-original` in the following example.
* The bucket that contains the resized images. The bucket is suffixed with `-resized` in the following example.

When you upload an image to the `-original` bucket a Lambda function is executed. The Lambda function downloads the image from S3, creates multiple resized versions and uploads them to the `-resized` S3 bucket. As of now three resized copies are created for every upload to `-original`:

* `150x`  fixed width, height is scaled as needed
* `50x50` scale image best into box
* `x150` fixed height, width is scaled as needed

You can find out how [ImageMagick resize](http://www.imagemagick.org/Usage/resize/) works or read on to deploy the solution.

## Deploying the solution

==WARNING: This example assumes that you have installed and configured the [AWS Command Line Interface](https://aws.amazon.com/cli/)==

Clone this repository ...

```
$ git clone git@github.com:AWSinAction/lambda.git
$ cd lambda/
```

or download and extract the zipped repository.

```
$ wget https://github.com/AWSinAction/lambda/archive/master.zip
$ unzip master.zip
$ cd lambda-master/
```

Create an S3 bucket for your Lambda code in the US East (N. Virginia, `us-east-1`) region and upload the `lambda.zip` file (replace `$LambdaS3Bucket` with a S3 bucket name e.g. `lambda-michael`).

==WARNING: This bucket has nothing to do with the resizing of images. It contains the zipped source code of the Lambda function.==

```
export AWS_DEFAULT_REGION=us-east-1
$ aws s3 mb s3://$LambdaS3Bucket
$ aws s3 cp lambda.zip s3://$LambdaS3Bucket/lambda.zip
```

Create a CloudFormation stack (replace `$ImageS3Bucket` with a name for your image bucket e. g. `image-michael`, replace `$LambdaS3Bucket` with your Lambda code S3 bucket name).

```
$ aws cloudformation create-stack --stack-name lambda-resize --template-body file://template.json --capabilities CAPABILITY_IAM --parameters ParameterKey=ImageS3Bucket,ParameterValue=$ImageS3Bucket ParameterKey=LambdaS3Bucket,ParameterValue=$LambdaS3Bucket
```

Wait until the stack is created (retry if you get `CREATE_IN_PROGRESS` this can take a few minutes).

```
$ aws cloudformation describe-stacks --stack-name lambda-resize --query Stacks[].StackStatus
[
    "CREATE_COMPLETE"
]
```

You can now upload your first image to the `-original` S3 bucket (you can also use the web based [Management Console](https://console.aws.amazon.com/s3) if you prefer).

```
$ aws s3 cp path/to/image.png s3://$ImageS3Bucket-original/image.png
```

You will see the resized images in the `-resized` bucket (you can also use the web based Management Console if you prefer).

```
$ aws s3 ls s3://$ImageS3Bucket-resized
  PRE 150x/
  PRE 50x50/
  PRE x150/
                           
$ aws s3 ls s3://$ImageS3Bucket-resized/150x/                           
```

As you can see, for every size configuration a new "directory" was created.

## What's next?

From this point you can think about how to enable your users to upload files into the `-original` S3 bucket if your use cases requires user generated content. To allow uploads from your users you should think about a way to protect your `-original` bucket with IAM permissions. You could use the [Security Token Service](http://docs.aws.amazon.com/STS/latest/APIReference/Welcome.html) to achieve this.

You should use CloudFront in combination with the `-resized` bucket to serve the resized images to your end users. This will decrease the latency by pushing your content to one of the edge locations of the CloudFront CDN network.

## Teardown

Remove all files in the `-original` and `-resized` bucket.

```
$ aws s3 rm --recursive s3://$ImageS3Bucket-original
$ aws s3 rm --recursive s3://$ImageS3Bucket-resized
```

Delete the CloudFormation stack.

```
$ aws cloudformation delete-stack --stack-name lambda-resize
```

Delete Lambda code S3 bucket (replace `$LambdaS3Bucket`).

```
$ aws s3 rb --force s3://$LambdaS3Bucket
```

## Customize the code

If you want to make changes to the code you need to create a new lambda code file (`lambda.zip`) and upload the new zip to S3. You can adjust the `config.json` file to adjust the size configurations.

```
$ npm install
$ ./bundle.sh
$ aws s3 cp lambda.zip s3://$LambdaS3Bucket/lambda.zip
```

## Summary

AWS Lambda can respond to S3 events like a new file was uploaded. The Lambda function will download the original image from S3 to create new resized images. The resized images are then upload to S3 again. The Lambda solution in scalable and does not require any operational work.