
var uuid = require('node-uuid');
var aws_cloudwatchlog = new (require('aws-services-lib/aws/cloudwatchlog.js'))();

var logGroupName = process.env.AWSCONFIGRULES_LOG_GROUP_NAME;

const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: body
  }
};

exports.handler = function (event, context) {

  console.log(event.Records[0].Sns);
  var message_json = JSON.parse(event.Records[0].Sns.Message);
  var region = event.Records[0].EventSubscriptionArn.split(":")[3];
  var messageId = event.Records[0].Sns.MessageId;
  var subject = event.Records[0].Sns.Subject;
  var message = event.Records[0].Sns.Message;
  var sentBy = event.Records[0].Sns.TopicArn;
  var sentAt = event.Records[0].Sns.Timestamp;
  var awsid = message_json.awsAccountId;
  var timestamp = message_json.StateChangeTime;
  var non_complaint_pattern = /\s{1,}NON_COMPLIANT/;

  if (non_complaint_pattern.test(subject)) {

    function succeeded(input) { context.done(null, createResponse(200, true)); }
    function failed(err) { context.fail(err, null); }
    function errored(err) { context.fail(err, null); }

    var logMessage = {
      "awsid": awsid,
      "subject": subject,
      "message": message,
      "sentBy": sentBy,
      "sentAt": sentAt
    };

    var input = {
      region: region,
      groupName: logGroupName,
      streamName: timestamp.replace(/:/g, '') + "-" + uuid.v4(),
      logMessage: JSON.stringify(logMessage),
      timestamp: (new Date()).getTime()
    };
    console.log(input);

    var flows = [
      {func:aws_cloudwatchlog.findLogGroup, success:aws_cloudwatchlog.findLogStream, failure:aws_cloudwatchlog.createLogGroup, error:errored},
      {func:aws_cloudwatchlog.createLogGroup, success:aws_cloudwatchlog.findLogStream, failure:failed, error:errored},
      {func:aws_cloudwatchlog.findLogStream, success:aws_cloudwatchlog.createLogEvents, failure:aws_cloudwatchlog.createLogStream, error:errored},
      {func:aws_cloudwatchlog.createLogStream, success:aws_cloudwatchlog.createLogEvents, failure:failed, error:errored},
      {func:aws_cloudwatchlog.createLogEvents, success:succeeded, failure:failed, error:errored}
    ]
    aws_cloudwatchlog.flows = flows;
    flows[0].func(input);
  }
  else{
    console.log("Non_Complaint_Alert_Message_False...Ignoring Alert Message.");
    context.done(null, createResponse(200, true));
  }
}
