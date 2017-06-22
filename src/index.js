
var AWS = require('aws-sdk');

var baseHandler = require('aws-services-lib/lambda/base_handler.js')

exports.handler = (event, context) => {
  baseHandler.handler(event, context);
}

baseHandler.get = function(params, callback) {

  var aws_config = new (require('aws-services-lib/aws/awsconfig.js'))();
  var aws  = require("aws-sdk");

  var input = {};
  if (params.region) input['region'] = params.region;
  if (params.credentials) {
    input['creds'] = new AWS.Credentials({
      accessKeyId: params.credentials.AccessKeyId,
      secretAccessKey: params.credentials.SecretAccessKey,
      sessionToken: params.credentials.SessionToken
    });
  }
  console.log(input)

  function succeeded(input) { callback(null, input.rules); }
  function failed(input) { callback(null, {result: false}); }
  function errored(err) { callback(err, null); }

  var flows = [
     {func:aws_config.getCreatedRules, success:succeeded, failure:failed, error:errored},
  ];
  aws_config.flows = flows;

  flows[0].func(input);
};

baseHandler.post = function(params, callback) {

  var aws_lambda = new (require('aws-services-lib/aws/lambda.js'))();
  var aws_config = new (require('aws-services-lib/aws/awsconfig.js'))();
  var aws  = require("aws-sdk");

  console.log('======PARAMS======');
  console.log(params);

  function setCredentials(input) {
    if (params.credentials) {
      input['creds'] = new AWS.Credentials({
        accessKeyId: params.credentials.AccessKeyId,
        secretAccessKey: params.credentials.SecretAccessKey,
        sessionToken: params.credentials.SessionToken
      });
      aws_config.enableRule(input);
    }
  }

  function succeeded(input) { callback(null, {result: true}); }
  function failed(input) { callback(null, {result: false}); }
  function errored(err) { callback(err, null); }
  var rules = params.rules; 
  for(var i=0;i< rules.length;i++){
     if(!rules[i].params)  rules[i].params="{}";
     var input = {
        region: params.region,
        ruleName: rules[i].ruleFunctionName,
        owner: rules[i].owner,
        sourceID: rules[i].sourceID,
        resourceType: rules[i].resourceType,
        descript: rules[i].desc,
        params: rules[i].params,
     };
     if (params.credentials) {
        input['creds'] = new AWS.Credentials({
           accessKeyId: params.credentials.AccessKeyId,
           secretAccessKey: params.credentials.SecretAccessKey,
           sessionToken: params.credentials.SessionToken
        });
    }

    if (rules[i].owner == "CUSTOM_LAMBDA"){
       input.sourceID = "arn:aws:lambda:"+ params.region + ":" + rules[i].masterAccount + ":function:" + rules[i].sourceID;
       input.messageType = rules[i].messageType;
       input.functionName = rules[i].functionName;
       input.principal = rules[i].principal;
       input.sourceAccount = params.customerAccount;
       input.statementId = rules[i].statementId; //unique string, some uuid from api
       input.action = rules[i].action;
       var flows = [
          {func:aws_lambda.addPermission, success:aws_config.enableRule, failure:failed, error:errored},
          {func:aws_config.enableRule, success:succeeded, failure:failed, error:errored}
       ];
    }
    else{
       var flows = [
          {func:aws_config.enableRule, success:succeeded, failure:failed, error:errored},
       ];
    }

    console.log(input);
    aws_config.flows = flows;
    aws_lambda.flows = flows;

    flows[0].func(input);
  }
};

baseHandler.delete = function(params, callback) {

  var aws_config = new (require('aws-services-lib/aws/awsconfig.js'))();
  var aws  = require("aws-sdk");

  function succeeded(input) { callback(null, {result: true}); }
  function failed(input) { callback(null, {result: false}); }
  function errored(err) { callback(err, null); }

  var input = {
      region: params.region,
      ruleName: params.ruleName
  };
  if (params.credentials) {
    input['creds'] = new AWS.Credentials({
      accessKeyId: params.credentials.AccessKeyId,
      secretAccessKey: params.credentials.SecretAccessKey,
      sessionToken: params.credentials.SessionToken
    });
  }
  console.log(input)

  var flows = [
      {func:aws_config.deleteRules, success:succeeded, failure:failed, error:errored},
  ];

  aws_config.flows = flows;

  flows[0].func(input);
};
