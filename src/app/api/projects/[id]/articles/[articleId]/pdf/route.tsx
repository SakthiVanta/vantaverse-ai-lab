import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { db } from "@/db";
import { researchArticles, assignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 11, fontFamily: "Helvetica", color: "#1c1917" },
  eyebrow: { fontSize: 9, color: "#78716c", letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 10 },
  meta: { fontSize: 10, color: "#78716c", marginBottom: 24 },
  paragraph: { marginBottom: 10, lineHeight: 1.6 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#a8a29e",
    borderTop: "1pt solid #e7e5e4",
    paddingTop: 8,
  },
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const { id, articleId } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [article, project] = await Promise.all([
    db.query.researchArticles.findFirst({
      where: and(eq(researchArticles.id, articleId), eq(researchArticles.assignmentId, id)),
    }),
    db.query.assignments.findFirst({ where: eq(assignments.id, id) }),
  ]);
  if (!article || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const paragraphs = article.content.split(/\n{2,}/).filter((p) => p.trim());

  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>VANTAVERSE · {project.title.toUpperCase()}</Text>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.meta}>
          By {article.authorName} · {article.createdAt.toLocaleDateString()}
        </Text>
        <View>
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p.trim()}
            </Text>
          ))}
        </View>
        <Text style={styles.footer} fixed>
          Vantaverse AI Builder Lab — Founding Builders · Cohort 01
        </Text>
      </Page>
    </Document>
  );

  const fileName = `${article.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
