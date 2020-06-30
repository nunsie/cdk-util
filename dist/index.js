"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CdkUtil = CdkUtil;
exports.default = void 0;

var cxapi = _interopRequireWildcard(require("@aws-cdk/cx-api"));

var colors = _interopRequireWildcard(require("colors/safe"));

var _awsAuth = require("aws-cdk/lib/api/aws-auth");

var _stacks = require("aws-cdk/lib/api/cxapp/stacks");

var _deploymentTarget = require("aws-cdk/lib/api/deployment-target");

var _cdkToolkit = require("aws-cdk/lib/cdk-toolkit");

var _init = require("aws-cdk/lib/init");

var _logging = require("aws-cdk/lib/logging");

var _settings = require("aws-cdk/lib/settings");

var version = _interopRequireWildcard(require("aws-cdk/lib/version"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

async function CdkUtil(app, command, args) {
  const aws = await _awsAuth.SdkProvider.withAwsCliCompatibleDefaults({
    ec2creds: true
  });
  const configuration = new _settings.Configuration({});
  await configuration.load();
  const provisioner = new _deploymentTarget.CloudFormationDeploymentTarget({
    aws
  });
  const appStacks = new _stacks.AppStacks({
    verbose: false,
    ignoreErrors: false,
    strict: false,
    configuration,
    aws,
    synthesizer: async () => app.synth()
  });

  const toolkitStackName = configuration.settings.get(["toolkitStackName"]) || _deploymentTarget.DEFAULT_TOOLKIT_STACK_NAME;

  if (toolkitStackName !== _deploymentTarget.DEFAULT_TOOLKIT_STACK_NAME) {
    (0, _logging.print)(`Toolkit stack: ${colors.bold(toolkitStackName)}`);
  }

  args.STACKS = args.STACKS || [];
  args.ENVIRONMENTS = args.ENVIRONMENTS || [];
  const cli = new _cdkToolkit.CdkToolkit({
    appStacks,
    provisioner
  });

  switch (command) {
    case "diff":
      return await cli.diff({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        templatePath: args.template,
        strict: args.strict,
        contextLines: args.contextLines,
        fail: args.fail || !configuration.context.get(cxapi.ENABLE_DIFF_NO_FAIL)
      });

    case "deploy":
      const parameterMap = {};

      for (const parameter of args.parameters) {
        if (typeof parameter === "string") {
          const keyValue = parameter.split("=", 2);
          parameterMap[keyValue[0]] = keyValue[1];
        }
      }

      return await cli.deploy({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        toolkitStackName,
        roleArn: args.roleArn,
        notificationArns: args.notificationArns,
        requireApproval: configuration.settings.get(["requireApproval"]),
        reuseAssets: args["build-exclude"],
        tags: configuration.settings.get(["tags"]),
        sdk: aws,
        execute: args.execute,
        force: args.force,
        parameters: parameterMap
      });

    case "destroy":
      return await cli.destroy({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        force: args.force,
        roleArn: args.roleArn,
        sdk: aws
      });

    case "init":
      const language = configuration.settings.get(["language"]);

      if (args.list) {
        return await (0, _init.printAvailableTemplates)(language);
      } else {
        return await (0, _init.cliInit)(args.TEMPLATE, language, undefined, args.generateOnly);
      }

    case "version":
      return (0, _logging.data)(version.DISPLAY_VERSION);

    default:
      throw new Error("Unknown command: " + command);
  }
}

var _default = CdkUtil;
exports.default = _default;
//# sourceMappingURL=index.js.map