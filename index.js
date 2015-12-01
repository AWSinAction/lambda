var async = require("async");
var AWS = require("aws-sdk");

var im = require("gm").subClass({imageMagick: true});
var s3 = new AWS.S3();

var CONFIG = require("./config.json");

function getImageType(objectContentType) {
	if (objectContentType === "image/jpeg") {
		return "jpeg";
	} else if (objectContentType === "image/png") {
		return "png";
	} else {
		throw new Error("unsupported objectContentType " + objectContentType);
	}
}

function cross(left, right) {
	var res = [];
	left.forEach(function(l) {
		right.forEach(function(r) {
			res.push([l, r]);
		});
	});
	return res;
}

exports.handler = function(event, context) {
	console.log("event ", JSON.stringify(event));
	async.mapLimit(event.Records, CONFIG.concurrency, function(record, cb) {
		var originalKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
		s3.getObject({
			"Bucket": record.s3.bucket.name,
			"Key": originalKey
		}, function(err, data) {
			if (err) {
				cb(err);
			} else {
				cb(null, {
					"originalKey": originalKey,
					"contentType": data.ContentType,
					"imageType": getImageType(data.ContentType),
					"buffer": data.Body,
					"record": record
				});
			}
		});
	}, function(err, images) {
		if (err) {
			context.fail(err);
		} else {
			var resizePairs = cross(CONFIG.sizes, images);
			async.eachLimit(resizePairs, CONFIG.concurrency, function(resizePair, cb) {
				var config = resizePair[0];
				var image = resizePair[1];
				im(image.buffer).resize(config).toBuffer(image.imageType, function(err, buffer) {
					if (err) {
						cb(err);
					} else {
						s3.putObject({
							"Bucket": image.record.s3.bucket.name.replace("-original", "-resized"),
							"Key": config + "/" + image.originalKey,
							"Body": buffer,
							"ContentType": image.contentType
						}, function(err) {
							cb(err);
						});
					}
				});
			}, function(err) {
				if (err) {
					context.fail(err);
				} else {
					context.succeed();
				}
			});
		}
	});
};
