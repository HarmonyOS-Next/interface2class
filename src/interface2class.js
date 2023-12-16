import { ts } from "@ast-grep/napi";

const VALUE_MAP = {
  string: "''",
  number: "0",
  boolean: "false",
};

const getSgNodeText = (sgNode, kind) => {
  return sgNode.find({ rule: { kind } })?.text();
};

const getSgNodes = (sgNode, kind) => {
  return sgNode.findAll({ rule: { kind } });
};

const getPropertyInfo = (sgNode, enumArr) => {
  const propertyName = getSgNodeText(sgNode, "property_identifier");
  let propertyType = getSgNodeText(sgNode, "predefined_type");
  let propertyValue = "";

  // string number boolean
  if (propertyType) {
    propertyValue = VALUE_MAP[propertyType];
  }

  // union
  if (getSgNodeText(sgNode, "union_type")) {
    propertyType = getSgNodeText(sgNode, "union_type");
    const unionArr = getSgNodes(sgNode, "literal_type");
    propertyValue = unionArr[0]?.text();
  }

  // array
  if (getSgNodeText(sgNode, "array_type")) {
    propertyType = getSgNodeText(sgNode, "array_type");
    propertyValue = "[]";
  }

  // enum and other
  if (!getSgNodeText(sgNode, "array_type") && getSgNodeText(sgNode, "type_identifier")) {
    propertyType = getSgNodeText(sgNode, "type_identifier");
    const enumInfo = enumArr.find((e) => e.name === propertyType);
    if (enumInfo && enumInfo.name) {
      propertyValue = enumInfo.value;
    } else {
      propertyValue = `new ${createModel(propertyType)}({} as ${propertyType})`;
      // propertyType = createModel(propertyType)
    }
  }

  return { propertyName, propertyType, propertyValue };
};

const createModel = (className) => `${className}Model`;

export const genItemClass = (sgNode, enumArr) => {
  // class 的名称
  const className = getSgNodeText(sgNode, "type_identifier");
  // 属性列表
  const propertyArr = getSgNodes(sgNode, "property_signature");

  // 属性字符
  let propertyStr = "";
  // 构造器字符
  let constructorStr = `  constructor(model: ${className}) {\n`;

  // 变量属性列表
  propertyArr.forEach((item) => {
    const info = getPropertyInfo(item, enumArr);
    propertyStr += `  ${info.propertyName}: ${info.propertyType} = ${info.propertyValue}\n`;
    constructorStr += `    this.${info.propertyName} = model.${info.propertyName}\n`;
  });

  constructorStr += `  }\n`;

  return `export class ${createModel(className)} implements ${className} {\n` + propertyStr + "\n" + constructorStr + `}\n`;
};

export const genClass = (code) => {
  const ast = ts.parse(code);

  const root = ast.root();

  const oldClassArr = getSgNodes(root, "class_declaration");

  const interfaceArr = getSgNodes(root, "interface_declaration");

  // 当前文件 enum
  const enumArr = getSgNodes(root, "enum_declaration").map((e) => {
    const name = getSgNodeText(e, "identifier");
    const value = `${name}.` + getSgNodeText(e, "property_identifier");
    return { name, value };
  });

  const newClassArr = interfaceArr.map((item) => {
    // 如果已经有class删除
    const className = getSgNodeText(item, "type_identifier");
    const oldClass = oldClassArr.find((c) => {
      const modelName = getSgNodeText(c, "type_identifier");
      return modelName === createModel(className);
    });
    if (oldClass) {
      code = code.replace('export ' + oldClass.text() + "\n", "").replace(oldClass.text() + "\n", "")
    }
    // 生成新的class
    return genItemClass(item, enumArr);
  });

  return code.padEnd('\n') +newClassArr.join("");
};
