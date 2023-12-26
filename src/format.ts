import { SgNode, ts } from "@ast-grep/napi";
import MagicString from "magic-string";

type updateStringItem = {
  start: number;
  end: number;
  text: string;
};

/**
 * @param { import('@ast-grep/napi').SgNode } sgNode - ast node
 * @param { string } kind - kind string
 */
export const findAllNodeByKind = (sgNode: SgNode, kind: string) => sgNode.findAll({ rule: { kind } });

/**
 * @param { import('@ast-grep/napi').SgNode } sgNode - ast node
 * @param { string } kind - kind string
 */
export const findNodeByKind = (sgNode: SgNode, kind: string) => sgNode.find({ rule: { kind } });

/**
 * @param { string } code - code string
 * @returns
 */
export const formatInterface = (code: string) => {
  const ast = ts.parse(code);

  const root = ast.root();

  // all interface sgNode
  const interfaceNodes = findAllNodeByKind(root, "interface_declaration");
  const commentNodes = findAllNodeByKind(root, "comment");

  /**
   * @type {{ start: number; end: number; text: string}[]}
   */
  const updateStrings: updateStringItem[] = [];
  /**
   * @param { import('@ast-grep/napi').SgNode } sgNode - ast node
   * @param { string } text - text string
   */
  const pushUpdateStrings = (sgNode: SgNode, text: string) => {
    if (sgNode) {
      const { start, end } = sgNode.range();
      updateStrings.push({
        start: start.index,
        end: end.index,
        text,
      });
    }
  };

  // 1. handle all comment
  commentNodes.forEach((item) => {
    const lines = item?.text()?.split("\n");
    const text = lines?.[1]?.replace(/\*/, "").trim();
    const commentText = text ? `/** ${text} */` : "";
    if (commentText) {
      pushUpdateStrings(item, commentText);
    }
  });

  // 2. handle all property
  interfaceNodes.forEach((item) => {
    const propertyNodes = findAllNodeByKind(item, "property_signature");
    propertyNodes.forEach((pro) => {
      if (pro.child(1)?.text() === "?") {
        // update optional
        const optionalNode = pro.child(1)!;
        pushUpdateStrings(optionalNode, "");
        // update type
        const typeNode = pro.child(2)!;
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
