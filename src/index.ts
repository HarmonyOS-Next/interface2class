import { ts } from "@ast-grep/napi";

const MAP = {
  string: "''",
  number: "0",
  boolean: "false",
};

const genClass = (code: string) => {
  const ast = ts.parse(code);

  const root = ast.root();

  const className = root.find({ rule: { kind: "type_identifier" } })?.text();

  if (!className) return;

  const propertyArr = root.findAll({ rule: { kind: "property_signature" } });

  let propertyStr = "";
  let constructorStr = `constructor(model: ${className}) {\n        `;
  propertyArr.forEach((item, i) => {
    const key = item.find({ rule: { kind: "property_identifier" } })?.text();
    let type = item.find({ rule: { kind: "predefined_type" } })?.text();
    if (!type) {
      type = item.find({ rule: { kind: "union_type" } })?.text();
      if (!type) {
        type = item.find({ rule: { kind: "type_identifier" } })?.text();
      }
    }
    if (key && type) {
      let defValue = "";
      if (MAP[type]) {
        defValue = MAP[type];
      } else {
        defValue = item.find({ rule: { kind: "literal_type" } })?.text() || `new ${type}()`;
      }
      propertyStr += `${key}: ${type} = ${defValue}\n      `;
      constructorStr += `this.${key} = model.${key}` + (propertyArr.length - 1 === i ? `\n      ` : `\n        `);
    }
  });
  constructorStr += `}`;

  return `
    class ${className}Model implements ${className} {
      ${propertyStr}
      ${constructorStr}
    }
  `;
};

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();

app.use(express.static("./public"));
app.use(bodyParser.json());
app.use(cors());

app.post("/gen", (req, res) => {
  console.log(req.body);
  const { text } = req.body;

  res.json({ text: genClass(text) });
});

app.listen(3000, () => console.log("server ok"));

// const source = `
interface Person {
  name: string;
  age: number;
  isMan: boolean;
}
// `;

// console.log(genClass(source));

// interface Person {
//   name: string
//   age: number
//   isMan: boolean
// }

// class Person implements Person{
//   name: string = 'jack'
//   age: number = 10
//   isMan: boolean = true

// }
