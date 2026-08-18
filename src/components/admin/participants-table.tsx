"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Participant = {
  id: string;
  name: string;
  email: string;
  status: string;
  githubConnected: boolean;
  githubUsername: string | null;
  aiApiKeyEncrypted: string | null;
  /** Pre-formatted server-side and passed as a plain string — formatting
   * a Date client-side here would re-run on hydration and can disagree
   * with the server's locale/ICU data (e.g. "19/8/2026" vs "19/08/2026"). */
  joinedLabel: string;
};

export function ParticipantsTable({ participants }: { participants: Participant[] }) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>GitHub</TableHead>
            <TableHead>AI Key</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer"
              onClick={() => router.push(`/admin/participants/${p.id}`)}
            >
              <TableCell>
                <Link
                  href={`/admin/participants/${p.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-foreground/60">{p.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{p.status.replaceAll("_", " ")}</Badge>
              </TableCell>
              <TableCell className="text-foreground/60">
                {p.githubConnected ? p.githubUsername : "—"}
              </TableCell>
              <TableCell>
                {p.aiApiKeyEncrypted ? (
                  <Badge variant="secondary">own key</Badge>
                ) : (
                  <span className="text-xs text-foreground/40">needs admin</span>
                )}
              </TableCell>
              <TableCell className="text-foreground/40">{p.joinedLabel}</TableCell>
            </TableRow>
          ))}
          {participants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-foreground/40">
                No builders yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
