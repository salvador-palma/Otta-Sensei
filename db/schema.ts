import { relations, sql } from "drizzle-orm";
import { date, primaryKey, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable, serial, integer, varchar, text, check } from "drizzle-orm/pg-core";


//========= VOCAB TABLE =========== \\

export const Vocab = pgTable(
  "Vocabulary",
  {
    id: serial("vocab_id").primaryKey(),
    kanji: varchar("kanji").notNull(),
    hiragana: varchar("hiragana").notNull(),
    meaning: text("meaning").notNull(),

    pos: varchar("pos"),
    level: integer("level"),

    sentenceEN: text("sent_en"),
    sentenceJP: text("sent_jp"),

    meaning2: text("meaning2"),
    pos2: varchar("pos2"),
    meaning3: text("meaning3"),
    pos3: varchar("pos3"),
    meaning4: text("meaning4"),
    pos4: varchar("pos4"),
  },

  (table) => ({
    levelRange: check(
      "level_range",
      sql`${table.level} BETWEEN 0 AND 5 OR ${table.level} IS NULL`
    ),

    kanjiHiraganaUnique: uniqueIndex("kanji_hiragana_unique").on(
      table.kanji,
      table.hiragana
    ),
  })
);

export const VocabRelations = relations(Vocab, ({ many }) => ({
  referencesTo: many(VocabReferences, {
    relationName: "referencesTo"
  }),
  referencedBy: many(VocabReferences, {
    relationName: "referencedBy"
  }),
  user_progress: many(UserVocabProgress, {
    relationName: "vocab_progress"
  })
}));


//========= VOCAB REFERENCES TABLE =========== \\

export const VocabReferences = pgTable("VocabReferences", {
  parentID: varchar("parentID").references(() => Vocab.kanji).notNull(),
  childID: varchar("childID").references(() => Vocab.kanji).notNull(),
},
  (table) => ({ pk: primaryKey({ columns: [table.parentID, table.childID] }) })
)

export const VocabReferencesRelations = relations(VocabReferences, ({ one }) => ({
  originalWord: one(Vocab, {
    fields: [VocabReferences.parentID],
    references: [Vocab.kanji],
    relationName: "referencesTo"
  }),
  relatedWord: one(Vocab, {
    fields: [VocabReferences.childID],
    references: [Vocab.kanji],
    relationName: "referencedBy"
  }),

}))

//========= USER TABLE =========== \\

export const User = pgTable("User", {
  user_ID: text("user_id").primaryKey(),
  user_name: text("user_name").notNull().default("User"),
  user_img_src: text("user_img_src").notNull().default("/mascot.svg"),

})

export const UserRelations = relations(User, ({ many }) => ({
  vocab_progress: many(Vocab, {
    relationName: "vocab_progress"
  }),
  progress: many(UserVocabProgress, {
    relationName: "user_progress"
  })
}))


//========= USER VOCAB PROGRESS =========== \\

export const UserVocabProgress = pgTable("UserVocabProgress", {
  user_ID: text("user_id").references(() => User.user_ID).notNull(),
  vocab_ID: integer("vocab_id").references(() => Vocab.id).notNull(),

  interval: integer("interval").notNull().default(0),
  repetition: integer("repetition").notNull().default(0),
  easiness_factor: integer("easiness_factor").notNull().default(2.5),
  due_date: timestamp('due_date', { mode: 'date' }),
},
  (table) => ({ pk: primaryKey({ columns: [table.user_ID, table.vocab_ID] }) })
)

export const UserVocabProgressRelations = relations(UserVocabProgress, ({ one }) => ({
  user: one(User, {
    fields: [UserVocabProgress.user_ID],
    references: [User.user_ID],
    relationName: "user_progress"
  }),
  vocab: one(Vocab, {
    fields: [UserVocabProgress.vocab_ID],
    references: [Vocab.id],
    relationName: "vocab_progress"
  }),
}))

// )