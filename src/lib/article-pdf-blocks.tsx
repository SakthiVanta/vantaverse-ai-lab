import { parse, type HTMLElement, type Node, NodeType } from "node-html-parser";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 4 },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: 6, marginTop: 4 },
  h3: { fontSize: 13, fontWeight: 700, marginBottom: 6, marginTop: 4 },
  paragraph: { fontSize: 11, lineHeight: 1.6, marginBottom: 10 },
  listItem: { flexDirection: "row", marginBottom: 4 },
  listBullet: { width: 14, fontSize: 11 },
  listContent: { flex: 1, fontSize: 11, lineHeight: 1.6 },
  blockquote: {
    borderLeft: "2pt solid #d6d3d1",
    paddingLeft: 10,
    marginBottom: 10,
    color: "#78716c",
    fontStyle: "italic",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 10,
    backgroundColor: "#f5f5f4",
    padding: 8,
    marginBottom: 10,
  },
  hr: { borderBottom: "1pt solid #e7e5e4", marginVertical: 10 },
});

type InlineStyle = { bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean };

function renderInline(node: Node, style: InlineStyle = {}, key: number): React.ReactNode {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = node.rawText;
    if (!text) return null;
    return (
      <Text
        key={key}
        style={{
          fontWeight: style.bold ? 700 : undefined,
          fontStyle: style.italic ? "italic" : undefined,
          textDecoration: style.strike ? "line-through" : undefined,
          fontFamily: style.code ? "Courier" : undefined,
        }}
      >
        {text}
      </Text>
    );
  }

  const el = node as HTMLElement;
  const nextStyle: InlineStyle = {
    bold: style.bold || el.tagName === "STRONG",
    italic: style.italic || el.tagName === "EM",
    strike: style.strike || el.tagName === "S",
    code: style.code || el.tagName === "CODE",
  };
  return el.childNodes.map((child, i) => renderInline(child, nextStyle, i));
}

function renderListItems(el: HTMLElement, ordered: boolean) {
  return el.childNodes
    .filter((n): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE && (n as HTMLElement).tagName === "LI")
    .map((li, i) => (
      <View key={i} style={styles.listItem}>
        <Text style={styles.listBullet}>{ordered ? `${i + 1}.` : "•"}</Text>
        <Text style={styles.listContent}>{li.childNodes.map((c, j) => renderInline(c, {}, j))}</Text>
      </View>
    ));
}

/** Converts sanitized article HTML (the small tag set the editor emits —
 * see sanitizeArticleHtml) into react-pdf primitives. Not a general HTML
 * renderer — react-pdf has no HTML support, so this walks the known
 * block/inline tags directly rather than pulling in a browser engine. */
export function renderArticleBodyToPdf(html: string): React.ReactElement {
  const root = parse(html);
  const blocks = root.childNodes
    .filter((n): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE)
    .map((el, i) => {
      switch (el.tagName) {
        case "H1":
          return (
            <Text key={i} style={styles.h1}>
              {el.childNodes.map((c, j) => renderInline(c, {}, j))}
            </Text>
          );
        case "H2":
          return (
            <Text key={i} style={styles.h2}>
              {el.childNodes.map((c, j) => renderInline(c, {}, j))}
            </Text>
          );
        case "H3":
          return (
            <Text key={i} style={styles.h3}>
              {el.childNodes.map((c, j) => renderInline(c, {}, j))}
            </Text>
          );
        case "P":
          return (
            <Text key={i} style={styles.paragraph}>
              {el.childNodes.map((c, j) => renderInline(c, {}, j))}
            </Text>
          );
        case "UL":
          return (
            <View key={i} style={{ marginBottom: 10 }}>
              {renderListItems(el, false)}
            </View>
          );
        case "OL":
          return (
            <View key={i} style={{ marginBottom: 10 }}>
              {renderListItems(el, true)}
            </View>
          );
        case "BLOCKQUOTE":
          return (
            <Text key={i} style={styles.blockquote}>
              {el.text}
            </Text>
          );
        case "PRE":
          return (
            <Text key={i} style={styles.code}>
              {el.text}
            </Text>
          );
        case "HR":
          return <View key={i} style={styles.hr} />;
        default:
          return (
            <Text key={i} style={styles.paragraph}>
              {el.text}
            </Text>
          );
      }
    });

  return <View>{blocks}</View>;
}
