import { type SgNode, ts } from "@ast-grep/napi";

const VALUE_MAP = {
  string: "''",
  number: "0",
  boolean: "false",
};

type ValueType = keyof typeof VALUE_MAP;

type EnumItem = {
  name: string;
  value: string;
};

const BUILT_TYPE = ["Resource", "ResourceStr"];

const getSgNodeText = (sgNode: SgNode, kind: string) => {
  return sgNode.find({ rule: { kind } })?.text();
};

const getSgNodes = (sgNode: SgNode, kind: string) => {
  return sgNode.findAll({ rule: { kind } });
};

const createModel = (className: string) => `${className}Model`;

const getPropertyValue = (type: string, enumArr: EnumItem[]) => {
  const enumInfo = enumArr.find((e) => e.name === type);
  if (enumInfo && enumInfo.name) {
    return enumInfo.value;
  } else {
    if (type === "ResourceStr") {
      return `''`;
    } else if (type === "Date") {
      return `new Date()`;
    } else {
      return `new ${createModel(type)}({} as ${type})`;
    }
  }
};

const getPropertyInfo = (sgNode: SgNode, enumArr: EnumItem[]) => {
  const propertyName = sgNode.child(0)?.text();

  const isOptional = sgNode.child(1)?.text() === "?";
  if (isOptional)
    throw new Error("Syntax Error: optional properties are not allowed , Recommended `name?: string →→→ name: string | null`");

  const propertyFullType = sgNode.child(1)?.child(1);
  const propertyType = propertyFullType?.text() as ValueType;
  let propertyValue = "";

  // string number boolean
  if (propertyFullType?.kind() === "predefined_type") {
    propertyValue = VALUE_MAP[propertyType];
  }
  // array
  if (propertyFullType?.kind() === "array_type") {
    propertyValue = "[]";
  }

  // literal
  if (propertyFullType?.kind() === "literal_type") {
    propertyValue = propertyType;
  }

  // union
  if (propertyFullType?.kind() === "union_type") {
    const literal = getSgNodeText(propertyFullType, "literal_type");
    if (literal) {
      const hasNull = getSgNodeText(propertyFullType, "null");
      propertyValue = hasNull || literal;
    } else {
      const predefined = getSgNodeText(propertyFullType, "predefined_type") as ValueType;
      if (predefined) {
        propertyValue = VALUE_MAP[predefined];
      } else {
        // enum and interface
        const type = getSgNodeText(propertyFullType, "type_identifier");
        propertyValue = getPropertyValue(type!, enumArr);
      }
    }
  }
  // enum and interface
  if (propertyFullType?.kind() === "type_identifier") {
    propertyValue = getPropertyValue(propertyFullType.text(), enumArr);
  }

  return { propertyName, propertyType, propertyValue };
};

export const genItemClass = (sgNode: SgNode, enumArr: EnumItem[], hasObserved: boolean) => {
  // class name
  const className = getSgNodeText(sgNode, "type_identifier");
  // property arr
  const propertyArr = getSgNodes(sgNode, "property_signature");

  // all property str
  let propertyStr = "";
  // all constructor str
  let constructorStr = `  constructor(model: ${className}) {\n`;

  // for each every property
  propertyArr.forEach((item) => {
    const info = getPropertyInfo(item, enumArr);
    propertyStr += `  ${info.propertyName}: ${info.propertyType} = ${info.propertyValue}\n`;
    constructorStr += `    this.${info.propertyName} = model.${info.propertyName}\n`;
  });

  constructorStr += `  }\n`;

  const observedStr = hasObserved ? "@Observed\n" : "";

  return (
    `${observedStr}export class ${createModel(className!)} implements ${className} {\n` +
    propertyStr +
    "\n" +
    constructorStr +
    `}\n`
  );
};

export const genClass = (code: string) => {
  const ast = ts.parse(code);

  const root = ast.root();

  const oldClassArr = getSgNodes(root, "class_declaration");

  const interfaceArr = getSgNodes(root, "interface_declaration");

  // current file enum
  const enumArr: EnumItem[] = getSgNodes(root, "enum_declaration").map((e) => {
    const name = getSgNodeText(e, "identifier")!;
    const value = `${name}.` + getSgNodeText(e, "property_identifier");
    return { name, value };
  });

  const newClassArr = interfaceArr.map((item) => {
    // has class remove
    const className = getSgNodeText(item, "type_identifier");
    const oldClass = oldClassArr.find((c) => {
      const modelName = c.child(1)?.text();
      return modelName === createModel(className!);
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
    // create new class
    return genItemClass(item, enumArr, hasObserved);
  });

  if (!/\n$/.test(code)) {
    code += "\n";
  }

  return code + newClassArr.join("");
};
