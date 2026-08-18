import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────

export const participantStatusEnum = pgEnum("participant_status", [
  "invited",
  "identity_pending",
  "identity_verified",
  "onboarding_in_progress",
  "onboarding_completed",
  "analysis_pending",
  "analysis_completed",
]);

export const confidenceEnum = pgEnum("confidence_level", [
  "low",
  "medium",
  "high",
]);

export const aiKeySourceEnum = pgEnum("ai_key_source", ["own", "admin_fallback"]);

export const assignmentDifficultyEnum = pgEnum("assignment_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const assignmentTargetStatusEnum = pgEnum("assignment_target_status", [
  "assigned",
  "viewed",
  "submitted",
  "reviewed",
]);

// ── Participants ─────────────────────────────────────────────────────

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

    spiritId: text("spirit_id"),
    spiritSelectedAt: timestamp("spirit_selected_at", { withTimezone: true }),

    githubUsername: text("github_username"),
    githubConnected: boolean("github_connected").notNull().default(false),
    githubConnectedAt: timestamp("github_connected_at", { withTimezone: true }),

    // Builder's own AI key (encrypted) — unlocks self-service analysis and
    // the chat assistant. Never returned to the client after being saved.
    aiApiKeyEncrypted: text("ai_api_key_encrypted"),
    aiApiKeyLast4: text("ai_api_key_last4"),
    aiApiKeySetAt: timestamp("ai_api_key_set_at", { withTimezone: true }),

    cohort: text("cohort").notNull().default("Founding Builders — Cohort 01"),
    status: participantStatusEnum("status").notNull().default("invited"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("participants_email_idx").on(table.email)]
);

export const participantsRelations = relations(participants, ({ many, one }) => ({
  otpCodes: many(otpCodes),
  challengeResponses: many(challengeResponses),
  githubProfile: one(githubProfiles, {
    fields: [participants.id],
    references: [githubProfiles.participantId],
  }),
  aiAnalysis: one(aiAnalyses, {
    fields: [participants.id],
    references: [aiAnalyses.participantId],
  }),
  builderCard: one(builderCards, {
    fields: [participants.id],
    references: [builderCards.participantId],
  }),
  problems: many(problems),
  events: many(events),
  notes: many(adminNotes),
  assignmentTargets: many(assignmentTargets),
  notifications: many(notifications),
}));

// ── Email OTP verification ──────────────────────────────────────────

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("otp_codes_participant_idx").on(table.participantId)]
);

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  participant: one(participants, {
    fields: [otpCodes.participantId],
    references: [participants.id],
  }),
}));

// ── Challenge responses (the 7 challenges + closing micro-interaction) ─

export const challengeResponses = pgTable(
  "challenge_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    challengeKey: text("challenge_key").notNull(),
    response: jsonb("response").notNull(),
    reasoning: text("reasoning"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("challenge_responses_participant_key_idx").on(
      table.participantId,
      table.challengeKey
    ),
  ]
);

export const challengeResponsesRelations = relations(
  challengeResponses,
  ({ one }) => ({
    participant: one(participants, {
      fields: [challengeResponses.participantId],
      references: [participants.id],
    }),
  })
);

// ── GitHub building history ─────────────────────────────────────────

export const githubProfiles = pgTable("github_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" })
    .unique(),
  username: text("username").notNull(),
  profile: jsonb("profile").notNull(), // raw public profile fields
  repositories: jsonb("repositories").notNull(), // array of repo summaries
  languageBreakdown: jsonb("language_breakdown"), // { TypeScript: 42, ... }
  projectThemes: jsonb("project_themes"), // ["AI", "Web Apps", ...]
  activitySignal: text("activity_signal"), // "High" | "Medium" | "Low"
  aiProjectEvidence: text("ai_project_evidence"), // "Strong" | "Moderate" | "Limited"
  // Account-level (not per-repo) commit/contribution evidence, including
  // contributions to repos the participant doesn't own.
  commitContributionsLastYear: integer("commit_contributions_last_year"),
  reposContributedToLastYear: integer("repos_contributed_to_last_year"),
  openSourceContribution: text("open_source_contribution"), // "Strong" | "Moderate" | "Limited"
  // string[] | null — null means "no selection made yet" (treat as "all
  // repos", the pre-existing behavior) so old rows stay valid unmigrated.
  selectedRepoNames: jsonb("selected_repo_names"),
  // GitHub's own weeks/contributionDays shape, stored as fetched — powers
  // the profile activity heatmap. Account-wide, not affected by repo selection.
  contributionCalendar: jsonb("contribution_calendar"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const githubProfilesRelations = relations(githubProfiles, ({ one }) => ({
  participant: one(participants, {
    fields: [githubProfiles.participantId],
    references: [participants.id],
  }),
}));

// ── AI analysis (Gemini output) ─────────────────────────────────────

export const aiAnalyses = pgTable("ai_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" })
    .unique(),

  primaryArchetype: text("primary_archetype").notNull(),
  secondaryArchetype: text("secondary_archetype"),

  signals: jsonb("signals").notNull(), // { exploration: 82, execution: 76, ... }
  strengthSignals: jsonb("strength_signals").notNull(), // string[]
  growthSignals: jsonb("growth_signals").notNull(), // string[]
  interests: jsonb("interests").notNull(), // string[]
  githubSummary: text("github_summary"),
  evidence: jsonb("evidence").notNull(), // [{ observation, evidence }]
  confidence: confidenceEnum("confidence").notNull().default("medium"),

  rawResponse: jsonb("raw_response").notNull(), // full structured AI output
  model: text("model").notNull(),
  keySource: aiKeySourceEnum("key_source").notNull(), // "own" | "admin_fallback"

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  participant: one(participants, {
    fields: [aiAnalyses.participantId],
    references: [participants.id],
  }),
}));

// ── Builder card (generated share image) ────────────────────────────

export const builderCards = pgTable("builder_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" })
    .unique(),
  imageUrl: text("image_url").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const builderCardsRelations = relations(builderCards, ({ one }) => ({
  participant: one(participants, {
    fields: [builderCards.participantId],
    references: [participants.id],
  }),
}));

// ── Builder report + email delivery log ─────────────────────────────

export const builderReports = pgTable("builder_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(), // structured report sections
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Problem Intelligence Dataset (Challenge 07 bridge) ──────────────

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  whoExperiencesIt: text("who_experiences_it").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  cluster: text("cluster"), // assigned later by cohort analysis
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const problemsRelations = relations(problems, ({ one }) => ({
  participant: one(participants, {
    fields: [problems.participantId],
    references: [participants.id],
  }),
}));

// ── Interaction timeline / events ───────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "started" | "spirit_selected" | "challenge_completed" | ...
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("events_participant_idx").on(table.participantId)]
);

export const eventsRelations = relations(events, ({ one }) => ({
  participant: one(participants, {
    fields: [events.participantId],
    references: [participants.id],
  }),
}));

// ── Admin ────────────────────────────────────────────────────────────

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_idx").on(table.email)]
);

export const adminNotes = pgTable("admin_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adminNotesRelations = relations(adminNotes, ({ one }) => ({
  participant: one(participants, {
    fields: [adminNotes.participantId],
    references: [participants.id],
  }),
  admin: one(adminUsers, {
    fields: [adminNotes.adminId],
    references: [adminUsers.id],
  }),
}));

// ── Assignment system (Phase 1 → Phase 2 bridge) ────────────────────

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: assignmentDifficultyEnum("difficulty").notNull().default("intermediate"),
  deadline: timestamp("deadline", { withTimezone: true }),
  resources: jsonb("resources"), // [{ type, label, url }]
  expectedOutput: text("expected_output"),
  createdBy: uuid("created_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assignmentTargets = pgTable(
  "assignment_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    status: assignmentTargetStatusEnum("status").notNull().default("assigned"),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assignment_targets_unique_idx").on(
      table.assignmentId,
      table.participantId
    ),
  ]
);

export const assignmentTargetsRelations = relations(
  assignmentTargets,
  ({ one }) => ({
    assignment: one(assignments, {
      fields: [assignmentTargets.assignmentId],
      references: [assignments.id],
    }),
    participant: one(participants, {
      fields: [assignmentTargets.participantId],
      references: [participants.id],
    }),
  })
);

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentTargetId: uuid("assignment_target_id")
    .notNull()
    .references(() => assignmentTargets.id, { onDelete: "cascade" })
    .unique(),
  repoUrl: text("repo_url"),
  demoUrl: text("demo_url"),
  reflection: text("reflection"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Project chat (one group channel per project/assignment) ─────────

export const chatSenderRoleEnum = pgEnum("chat_sender_role", ["participant", "admin"]);

export const projectMessages = pgTable(
  "project_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    senderParticipantId: uuid("sender_participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    senderAdminId: uuid("sender_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    // Denormalized so listing a channel never has to join participants/admins
    // per message — matters once a project has thousands of messages.
    senderName: text("sender_name").notNull(),
    senderRole: chatSenderRoleEnum("sender_role").notNull(),
    senderEmoji: text("sender_emoji"), // spirit emoji for participants, fixed icon for admin
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("project_messages_assignment_created_idx").on(table.assignmentId, table.createdAt)]
);

export const projectMessagesRelations = relations(projectMessages, ({ one }) => ({
  assignment: one(assignments, {
    fields: [projectMessages.assignmentId],
    references: [assignments.id],
  }),
}));

// ── Research module (articles published inside a project) ───────────

export const researchArticles = pgTable(
  "research_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    authorParticipantId: uuid("author_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(), // markdown
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("research_articles_assignment_created_idx").on(table.assignmentId, table.createdAt)]
);

export const researchArticlesRelations = relations(researchArticles, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [researchArticles.assignmentId],
    references: [assignments.id],
  }),
  author: one(participants, {
    fields: [researchArticles.authorParticipantId],
    references: [participants.id],
  }),
  likes: many(researchArticleLikes),
  comments: many(researchArticleComments),
}));

export const researchArticleLikes = pgTable(
  "research_article_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => researchArticles.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("research_article_likes_unique_idx").on(table.articleId, table.participantId)]
);

export const researchArticleComments = pgTable(
  "research_article_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => researchArticles.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("research_article_comments_article_created_idx").on(table.articleId, table.createdAt)]
);

export const assignmentsRelations = relations(assignments, ({ many }) => ({
  targets: many(assignmentTargets),
  messages: many(projectMessages),
  articles: many(researchArticles),
}));

// ── Notifications (project assignments + chat @mentions) ────────────

export const notificationTypeEnum = pgEnum("notification_type", [
  "project_assigned",
  "project_mentioned",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    sourceMessageId: uuid("source_message_id").references(() => projectMessages.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_participant_created_idx").on(table.participantId, table.createdAt)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  participant: one(participants, {
    fields: [notifications.participantId],
    references: [participants.id],
  }),
  assignment: one(assignments, {
    fields: [notifications.assignmentId],
    references: [assignments.id],
  }),
}));
