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

const getPropertyInfo = (sgNode) => {
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
    propertyValue = unionArr[0]?.text()
  }

  // array
  if (getSgNodeText(sgNode, "array_type")) {
    propertyType = getSgNodeText(sgNode, "array_type");
    propertyValue = "[]";
  }

  // other
  if (getSgNodeText(sgNode, "type_identifier")) {
    propertyType = getSgNodeText(sgNode, "type_identifier");
    propertyValue = `new ${propertyType}Model({} as ${propertyType})`;
  }

  return { propertyName, propertyType, propertyValue };
};

export const genItemClass = (sgNode) => {
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
    const info = getPropertyInfo(item);
    propertyStr += `  ${info.propertyName}: ${info.propertyType} = ${info.propertyValue}\n`;
    constructorStr += `    this.${info.propertyName} = model.${info.propertyName}\n`;
  });

  constructorStr += `  }\n`;

  return `class ${className}Model implements ${className} {\n` + propertyStr + "\n" + constructorStr + `}\n`;
};

export const genClass = (code) => {
  const ast = ts.parse(code);

  const root = ast.root();

  const interfaceArr = getSgNodes(root, "interface_declaration");

  const classArr = interfaceArr.map((item) => {
    return genItemClass(item);
  });

  return classArr.join("\n");
};
