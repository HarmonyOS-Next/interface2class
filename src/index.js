#!/usr/bin/env node

import { Command } from "commander";
import { cliVersion } from "./version.js";
import fse from "fs-extra";
import consola from "consola";
import { genClass } from "./interface2class.js";
import { input } from "@inquirer/prompts";

const program = new Command();

program.version(`v${cliVersion}`);

// program.action(() => {
//   input({ message: "InterfaceCode: ", transformer: (value = "") => value.replace(/\n/g, "") })
//     .then((res) => {
//       consola.success("Result: \n", genClass(res));
//     })
//     .catch(() => {
//       consola.error("Error");
//     });
// });

program.argument("<file path>").action((filePath) => {
  try {
    consola.start('Class Generate ...')
    const str = fse.readFileSync(filePath, "utf8");
    const result = genClass(str);
    fse.writeFileSync(filePath, result);
    consola.success(`Class Generate Successful`)
    consola.box('Tip: The file has been modified')
  } catch (e) {
    consola.error(e)
  }
});

program.parse(process.argv);
