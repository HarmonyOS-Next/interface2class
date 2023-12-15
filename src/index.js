#!/usr/bin/env node

import { Command } from "commander";
import { cliVersion } from "./version.js";
import consola from "consola";
import { genClass } from "./interface2class.js";
import input from "@inquirer/input";

const program = new Command();

program.action(() => {
  input({ message: "InterfaceCode: " })
    .then((res) => {
      consola.success("Result: \n", genClass(res));
    })
    .catch(() => {
      consola.error("Error");
    });
});

program.parse(process.argv);
