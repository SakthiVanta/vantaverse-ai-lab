"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, Heart, Loader2, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor, RichTextView } from "@/components/editor/rich-text-editor";

type ArticleSummary = {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
};

type ArticleDetail = {
  article: { id: string; title: string; content: string; authorName: string; createdAt: string };
  likeCount: number;
  likedByMe: boolean;
  comments: { id: string; body: string; authorName: string; createdAt: string }[];
};

/** Cheap client-side "is there actually anything written" check — final
 * sanitization/validation still happens server-side; this is just UX. */
function hasVisibleContent(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim().length > 0;
}

export function ProjectResearch({
  projectId,
  canPublish,
}: {
  projectId: string;
  canPublish: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const articleParam = searchParams.get("article");
  const [publishing, setPublishing] = useState(false);

  const openArticle = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("article", id);
    else params.delete("article");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (publishing) {
    return (
      <PublishForm
        projectId={projectId}
        onCancel={() => setPublishing(false)}
        onPublished={(id) => {
          setPublishing(false);
          openArticle(id);
        }}
      />
    );
  }

  if (articleParam) {
    return (
      <ArticleView
        projectId={projectId}
        articleId={articleParam}
        canInteract={canPublish}
        onBack={() => openArticle(null)}
      />
    );
  }

  return (
    <ArticleList
      projectId={projectId}
      canPublish={canPublish}
      onOpen={(id) => openArticle(id)}
      onPublish={() => setPublishing(true)}
    />
  );
}

function ArticleList({
  projectId,
  canPublish,
  onOpen,
  onPublish,
}: {
  projectId: string;
  canPublish: boolean;
  onOpen: (id: string) => void;
  onPublish: () => void;
}) {
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/articles`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { articles: [] }))
      .then((data) => setArticles(data.articles))
      .catch(() => setArticles([]));
  }, [projectId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground/45">
          Research your project team has published — write-ups, findings, anything worth sharing.
        </p>
        {canPublish && (
          <Button size="sm" className="shrink-0 gap-1.5" onClick={onPublish}>
            <Plus className="h-3.5 w-3.5" />
            Publish
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {articles === null && (
          <>
            <div className="h-20 animate-pulse rounded-2xl bg-card" />
            <div className="h-20 animate-pulse rounded-2xl bg-card" />
          </>
        )}
        {articles?.length === 0 && (
          <div className="hairline rounded-2xl bg-card px-6 py-10 text-center">
            <p className="text-sm text-foreground/45">Nothing published yet.</p>
          </div>
        )}
        {articles?.map((a) => (
          <button
            key={a.id}
            onClick={() => onOpen(a.id)}
            className="hairline block w-full rounded-2xl bg-card px-5 py-4 text-left transition-colors hover:bg-accent/60"
          >
            <p className="font-medium text-foreground">{a.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-foreground/50">{a.excerpt}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-foreground/40">
              <span>{a.authorName}</span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {a.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {a.commentCount}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PublishForm({
  projectId,
  onCancel,
  onPublished,
}: {
  projectId: string;
  onCancel: () => void;
  onPublished: (articleId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    if (!title.trim() || !hasVisibleContent(content) || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't publish that");
        return;
      }
      toast.success("Published to the project");
      onPublished(data.article.id);
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
      >
        <ArrowLeft className="h-3 w-3" /> Back to research
      </button>
      <Input
        placeholder="Article title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={publishing}
      />
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Share what you found — headings, lists, quotes, whatever the idea needs…"
      />
      <Button
        className="w-full gap-2"
        size="lg"
        disabled={publishing || !title.trim() || !hasVisibleContent(content)}
        onClick={publish}
      >
        {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
        {publishing ? "Publishing…" : "Publish to project"}
      </Button>
    </div>
  );
}

function ArticleView({
  projectId,
  articleId,
  canInteract,
  onBack,
}: {
  projectId: string;
  articleId: string;
  canInteract: boolean;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch(`/api/projects/${projectId}/articles/${articleId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setDetail)
      .catch(() => {});
  };

  useEffect(load, [projectId, articleId]);

  const toggleLike = async () => {
    if (liking || !canInteract) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/articles/${articleId}/like`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't like that");
        return;
      }
      setDetail((prev) => (prev ? { ...prev, likedByMe: data.likedByMe, likeCount: data.likeCount } : prev));
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setLiking(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || commenting || !canInteract) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/articles/${articleId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add that comment");
        return;
      }
      setDetail((prev) => (prev ? { ...prev, comments: [...prev.comments, data.comment] } : prev));
      setCommentText("");
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setCommenting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy the URL from your address bar instead.");
    }
  };

  if (!detail) {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
      >
        <ArrowLeft className="h-3 w-3" /> Back to research
      </button>

      <h3 className="mt-4 font-heading text-xl font-semibold">{detail.article.title}</h3>
      <p className="mt-1 text-xs text-foreground/45">
        {detail.article.authorName} · {new Date(detail.article.createdAt).toLocaleDateString()}
      </p>

      <div className="mt-5">
        <RichTextView html={detail.article.content} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={toggleLike}
          disabled={!canInteract || liking}
          className={`hairline flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            detail.likedByMe ? "bg-accent text-foreground" : "bg-card text-foreground/60"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${detail.likedByMe ? "fill-current" : ""}`} />
          {detail.likeCount}
        </button>
        <button
          onClick={copyLink}
          className="hairline flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`/api/projects/${projectId}/articles/${articleId}/pdf`}
          className="hairline flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
          Comments ({detail.comments.length})
        </p>
        <div className="mt-3 space-y-3">
          {detail.comments.map((c) => (
            <div key={c.id} className="hairline rounded-xl bg-card px-3.5 py-2.5">
              <p className="text-xs font-medium text-foreground/60">{c.authorName}</p>
              <p className="mt-0.5 text-sm text-foreground/80">{c.body}</p>
            </div>
          ))}
        </div>

        {canInteract && (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={commenting}
              placeholder="Add a comment…"
              className="h-10 flex-1 rounded-xl border-[1.5px] border-border bg-card px-3 text-sm outline-none focus-visible:border-foreground disabled:opacity-50"
            />
            <Button size="sm" disabled={commenting || !commentText.trim()} onClick={submitComment}>
              {commenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
