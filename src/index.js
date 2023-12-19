#!/usr/bin/env node

import { Command } from "commander";
import { cliVersion } from "./version.js";
import fse from "fs-extra";
import pc from "picocolors";
import { genClass } from "./interface2class.js";
import { formatInterface } from "./format.js";

const program = new Command();

program.version(`v${cliVersion}`);

program.argument("<file path>").action((filePath) => {
  try {
    console.log(pc.magenta("◐"), "Class Generate ...");
    const str = fse.readFileSync(filePath, "utf8");
    const result = genClass(str);
    fse.writeFileSync(filePath, result);
    console.log(pc.green("✔"), `Class Generate Successful`);
  } catch (e) {
    console.log(pc.bgRed("Error"), pc.red(e.message || "Class Generate Fail"));
  }
});

program
  .command("format")
  .argument("<file path>")
  .action((filePath) => {
    try {
      console.log(pc.magenta("◐"), "Interface Format ...");
      const str = fse.readFileSync(filePath, "utf8");
      const result = formatInterface(str);
      fse.writeFileSync(filePath, result);
      console.log(pc.green("✔"), `Interface Format Successful`);
    } catch (e) {
      console.log(pc.bgRed("Error"), pc.red(e.message || "Interface Format Fail"));
    }
  });

program.parse(process.argv);
