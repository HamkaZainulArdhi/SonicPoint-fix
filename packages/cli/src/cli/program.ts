import { Command } from "commander";
import { initCommand, interactiveCommand, reportCommand, scanCommand, schemaCommand, sendCommand } from "./commands.js";

export async function runProgram(argv: string[] = process.argv): Promise<void> {
  // Interactive TUI: `sonic-point` with no subcommand. Everything else
  // (including --help / --version) keeps going to commander unchanged.
  if (argv.slice(2).length === 0) {
    await interactiveCommand(process.cwd());
    return;
  }

  const program = new Command();

  program.name("sonic-point").description("AI Powered API Scanner").version("2.0.0");

  program
    .command("scan")
    .description("Scan all endpoints")
    .option("--schema", "Connect endpoints with validation schemas")
    .option("--context", "Build backend knowledge graph")
    .option("--snippets", "Output source snippets as JSON")
    .action((options) => scanCommand(process.cwd(), options));

  program
    .command("schema")
    .description("Extract validation schemas")
    .action(() => schemaCommand(process.cwd()));

  program
    .command("init")
    .description("Initialize backend target and provider configuration")
    .action(() => initCommand(process.cwd()));

  program
    .command("send")
    .description("Send HTTP requests to endpoints")
    .argument("[endpoint]", "Target endpoint path")
    .option("--method <method>", "Send only the selected method for one explicit endpoint")
    .action((endpoint: string | undefined, options: { method?: string }) =>
      sendCommand(process.cwd(), endpoint, options),
    );

  program
    .command("report")
    .description("Publish cached test results and print the session report link")
    .argument("[method]", "Optional HTTP method filter, e.g. GET or POST")
    .argument("[endpoint]", "Optional cached endpoint path filter")
    .action((method: string | undefined, endpoint: string | undefined) =>
      reportCommand(process.cwd(), method, endpoint),
    );

  await program.parseAsync(argv);
}
