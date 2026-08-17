import { ImageResponse } from "next/og";
import { db } from "@/db";
import { participants, aiAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSpiritById } from "@/lib/spirits";

export const runtime = "nodejs";

// Intentionally unauthenticated: the spec (§29-30) treats the Builder Card
// as a shareable public asset (displayed, downloaded, shared, emailed), so
// anyone with a participant's opaque UUID can render their card image —
// same trust model as an unlisted share link. Only name/archetype/interests
// are exposed here, never email or raw challenge responses.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });
  if (!participant) {
    return new Response("Not found", { status: 404 });
  }

  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, id),
  });

  const spirit = participant.spiritId ? getSpiritById(participant.spiritId) : undefined;
  const archetype = analysis?.primaryArchetype ?? "Founding Builder";
  const interests = ((analysis?.interests as string[]) ?? []).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at 20% 0%, #2a1a4a 0%, #0a0a12 55%), linear-gradient(160deg, #0a0a12 0%, #0d0a16 100%)",
          fontFamily: "sans-serif",
          color: "#f5f5fa",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#f5f5fa",
            }}
          >
            VANTAVERSE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: 4,
              color: "#9a9ab8",
              marginTop: 6,
            }}
          >
            AI BUILDER LAB
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 160, marginBottom: 32 }}>
            {spirit?.emoji ?? "✨"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              backgroundImage:
                "linear-gradient(100deg, #a78bfa 0%, #f472b6 50%, #67e8f9 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {archetype}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 600,
              marginTop: 24,
              color: "#f5f5fa",
            }}
          >
            {participant.name.toUpperCase()}
          </div>
          {interests.length > 0 && (
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 3,
                color: "#9a9ab8",
                marginTop: 18,
                textTransform: "uppercase",
              }}
            >
              {interests.join("  ·  ")}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "#f5f5fa" }}>
            COHORT 01
          </div>
          <div style={{ display: "flex", fontSize: 16, color: "#9a9ab8", marginTop: 4 }}>
            FOUNDING BUILDER
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
