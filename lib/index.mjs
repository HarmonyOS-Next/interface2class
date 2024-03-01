#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import fse from 'fs-extra';
import pc from 'picocolors';
import { ts } from '@ast-grep/napi';
import MagicString from 'magic-string';

const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
const cliVersion = packageJson.version;

const VALUE_MAP = {
  string: "''",
  number: "0",
  boolean: "false"
};
const getSgNodeText = (sgNode, kind) => {
  return sgNode.find({ rule: { kind } })?.text();
};
const getSgNodes = (sgNode, kind) => {
  return sgNode.findAll({ rule: { kind } });
};
const createModel = (className) => `${className}Model`;
const getPropertyValue = (type, enumArr, simple = false) => {
  const enumInfo = enumArr.find((e) => e.name === type);
  if (enumInfo && enumInfo.name) {
    return enumInfo.value;
  } else {
    if (type === "ResourceStr") {
      return `''`;
    } else if (type === "Date") {
      return `new Date()`;
    } else {
      if (simple) {
        return `new ${createModel(type)}()`;
      } else {
        return `new ${createModel(type)}({} as ${type})`;
      }
    }
  }
};
const getPropertyInfo = (sgNode, enumArr, simple) => {
  const propertyName = sgNode.child(0)?.text();
  const isOptional = sgNode.child(1)?.text() === "?";
  if (isOptional)
    throw new Error("Syntax Error: optional properties are not allowed , Recommended `name?: string \u2192\u2192\u2192 name: string | null`");
  const propertyFullType = sgNode.child(1)?.child(1);
  const propertyType = propertyFullType?.text();
  let propertyValue = "";
  if (propertyFullType?.kind() === "predefined_type") {
    propertyValue = VALUE_MAP[propertyType];
  }
  if (propertyFullType?.kind() === "array_type") {
    propertyValue = "[]";
  }
  if (propertyFullType?.kind() === "literal_type") {
    propertyValue = propertyType;
  }
  if (propertyFullType?.kind() === "union_type") {
    const literal = getSgNodeText(propertyFullType, "literal_type");
    if (literal) {
      const hasNull = getSgNodeText(propertyFullType, "null");
      propertyValue = hasNull || literal;
    } else {
      const predefined = getSgNodeText(propertyFullType, "predefined_type");
      if (predefined) {
        propertyValue = VALUE_MAP[predefined];
      } else {
        const type = getSgNodeText(propertyFullType, "type_identifier");
        propertyValue = getPropertyValue(type, enumArr, simple);
      }
    }
  }
  if (propertyFullType?.kind() === "type_identifier") {
    propertyValue = getPropertyValue(propertyFullType.text(), enumArr, simple);
  }
  return { propertyName, propertyType, propertyValue };
};
const genItemClass = (sgNode, enumArr, hasObserved, simple) => {
  const className = getSgNodeText(sgNode, "type_identifier");
  const propertyArr = getSgNodes(sgNode, "property_signature");
  let propertyStr = "";
  let constructorStr = `  constructor(model: ${className}) {
`;
  propertyArr.forEach((item) => {
    const info = getPropertyInfo(item, enumArr, simple);
    propertyStr += `  ${info.propertyName}: ${info.propertyType} = ${info.propertyValue}
`;
    constructorStr += `    this.${info.propertyName} = model.${info.propertyName}
`;
  });
  constructorStr += `  }
`;
  const observedStr = hasObserved ? "@Observed\n" : "";
  return `${observedStr}export class ${createModel(className)} implements ${className} {
` + propertyStr + (simple ? "" : "\n") + (simple ? "" : constructorStr) + `}
`;
};
const genClass = (code, simple = false) => {
  const ast = ts.parse(code);
  const root = ast.root();
  const oldClassArr = getSgNodes(root, "class_declaration");
  const interfaceArr = getSgNodes(root, "interface_declaration");
  const enumArr = getSgNodes(root, "enum_declaration").map((e) => {
    const name = getSgNodeText(e, "identifier");
    const value = `${name}.` + getSgNodeText(e, "property_identifier");
    return { name, value };
  });
  const newClassArr = interfaceArr.map((item) => {
    const className = getSgNodeText(item, "type_identifier");
    const oldClass = oldClassArr.find((c) => {
      const modelName = c.child(1)?.text();
      return modelName === createModel(className);
    });
    let hasObserved = false;
    if (oldClass) {
      const exportSgNode = oldClass?.prev();
      const decoratorSgNode = exportSgNode?.prev();
      if (exportSgNode) {
        code = code.replace(oldClass.parent()?.text() + "\n", "");
      }
      if (decoratorSgNode) {
        hasObserved = true;
      }
    }
    return genItemClass(item, enumArr, hasObserved, simple);
  });
  if (!/\n$/.test(code)) {
    code += "\n";
  }
  return code + newClassArr.join("");
};

const findAllNodeByKind = (sgNode, kind) => sgNode.findAll({ rule: { kind } });
const findNodeByKind = (sgNode, kind) => sgNode.find({ rule: { kind } });
const formatInterface = (code) => {
  const ast = ts.parse(code);
  const root = ast.root();
  const interfaceNodes = findAllNodeByKind(root, "interface_declaration");
  const commentNodes = findAllNodeByKind(root, "comment");
  const updateStrings = [];
  const pushUpdateStrings = (sgNode, text) => {
    if (sgNode) {
      const { start, end } = sgNode.range();
      updateStrings.push({
        start: start.index,
        end: end.index,
        text
      });
    }
  };
  commentNodes.forEach((item) => {
    const lines = item?.text()?.split("\n");
    const text = lines?.[1]?.replace(/\*/, "").trim();
    const commentText = text ? `/** ${text} */` : "";
    if (commentText) {
      pushUpdateStrings(item, commentText);
    }
  });
  interfaceNodes.forEach((item) => {
    const propertyNodes = findAllNodeByKind(item, "property_signature");
    propertyNodes.forEach((pro) => {
      if (pro.child(1)?.text() === "?") {
        const optionalNode = pro.child(1);
        pushUpdateStrings(optionalNode, "");
        const typeNode = pro.child(2);
        const nullNode = findNodeByKind(typeNode, "null");
        if (!nullNode) {
          pushUpdateStrings(typeNode, typeNode.text() + " | null");
        }
      }
    });
  });
  const s = new MagicString(code);
  updateStrings.forEach((item) => {
    s.update(item.start, item.end, item.text);
  });
  s.replaceAll("  [property: string]: any;\n", "");
  return s.toString();
};

const program = new Command();
program.version(`v${cliVersion}`);
program.argument("<file path>").action((filePath) => {
  try {
    console.log(pc.magenta("\u25D0"), "Class Generate ...");
    const str = fse.readFileSync(filePath, "utf8");
    const formatStr = formatInterface(str);
    const result = genClass(formatStr);
    fse.writeFileSync(filePath, result);
    console.log(pc.green("\u2714"), `Class Generate Successful`);
  } catch (e) {
    console.log(pc.bgRed("Error"), pc.red(e.message || "Class Generate Fail"));
  }
});
program.command("simple").argument("<file path>").action((filePath) => {
  try {
    console.log(pc.magenta("\u25D0"), "Class Generate ...");
    const str = fse.readFileSync(filePath, "utf8");
    const formatStr = formatInterface(str);
    const result = genClass(formatStr, true);
    fse.writeFileSync(filePath, result);
    console.log(pc.green("\u2714"), `Class Generate Successful`);
  } catch (e) {
    console.log(pc.bgRed("Error"), pc.red(e.message || "Class Generate Fail"));
  }
});
program.command("format").argument("<file path>").action((filePath) => {
  try {
    console.log(pc.magenta("\u25D0"), "Interface Format ...");
    const str = fse.readFileSync(filePath, "utf8");
    const result = formatInterface(str);
    fse.writeFileSync(filePath, result);
    console.log(pc.green("\u2714"), `Interface Format Successful`);
  } catch (e) {
    console.log(pc.bgRed("Error"), pc.red(e.message || "Interface Format Fail"));
  }
});
program.parse(process.argv);
