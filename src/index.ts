import * as cxapi from "@aws-cdk/cx-api";
import * as colors from "colors/safe";

import { SdkProvider } from "aws-cdk/lib/api/aws-auth";
import { AppStacks } from "aws-cdk/lib/api/cxapp/stacks";
import { CloudFormationDeploymentTarget, DEFAULT_TOOLKIT_STACK_NAME } from "aws-cdk/lib/api/deployment-target";
import { CdkToolkit } from "aws-cdk/lib/cdk-toolkit";
import { cliInit, printAvailableTemplates } from "aws-cdk/lib/init";
import { data, print } from "aws-cdk/lib/logging";
import { Configuration } from "aws-cdk/lib/settings";
import * as version from "aws-cdk/lib/version";
import { RequireApproval } from "aws-cdk/lib/diff";

export async function CdkUtil(app: any, command: string, args: any): Promise<number | string | {} | void> {
  const aws = await SdkProvider.withAwsCliCompatibleDefaults({ ec2creds: true });

  const configuration = new Configuration({});
  await configuration.load();

  const provisioner = new CloudFormationDeploymentTarget({ aws });

  const appStacks = new AppStacks({
    verbose: false,
    ignoreErrors: false,
    strict: false,
    configuration,
    aws,
    synthesizer: async () => app.synth(),
  });

  const toolkitStackName: string = configuration.settings.get(["toolkitStackName"]) || DEFAULT_TOOLKIT_STACK_NAME;

  if (toolkitStackName !== DEFAULT_TOOLKIT_STACK_NAME) {
    print(`Toolkit stack: ${colors.bold(toolkitStackName)}`);
  }

  args.STACKS = args.STACKS || [];
  args.ENVIRONMENTS = args.ENVIRONMENTS || [];

  const cli = new CdkToolkit({ appStacks, provisioner });

  switch (command) {
    case "diff":
      return await cli.diff({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        templatePath: args.template,
        strict: args.strict,
        contextLines: args.contextLines,
        fail: args.fail || !configuration.context.get(cxapi.ENABLE_DIFF_NO_FAIL),
      });

    case "deploy":
      const parameterMap: { [name: string]: string | undefined } = {};
      for (const parameter of args.parameters) {
        if (typeof parameter === "string") {
          const keyValue = (parameter as string).split("=", 2);
          parameterMap[keyValue[0]] = keyValue[1];
        }
      }
      return await cli.deploy({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        toolkitStackName,
        roleArn: args.roleArn,
        notificationArns: args.notificationArns,
        requireApproval: RequireApproval.Never,
        reuseAssets: args["build-exclude"],
        tags: configuration.settings.get(["tags"]),
        sdk: aws,
        execute: args.execute,
        force: args.force,
        parameters: parameterMap,
      });

    case "destroy":
      return await cli.destroy({
        stackNames: args.STACKS,
        exclusively: args.exclusively,
        force: args.force,
        roleArn: args.roleArn,
        sdk: aws,
      });

    case "init":
      const language = configuration.settings.get(["language"]);
      if (args.list) {
        return await printAvailableTemplates(language);
      } else {
        return await cliInit(args.TEMPLATE, language, undefined, args.generateOnly);
      }
    case "version":
      return data(version.DISPLAY_VERSION);

    default:
      throw new Error("Unknown command: " + command);
  }
}

export default CdkUtil;
