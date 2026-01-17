import { sql } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/gel-core";
import { pgTable, serial, integer, varchar, text, check } from "drizzle-orm/pg-core";

export const Vocab = pgTable(
  "Vocabulary",
  {
    id: serial("VocabID").primaryKey(),
    reading: varchar("Reading").notNull(),
    furigana: varchar("Furigana").notNull(),
    meaning: text("Meaning").notNull(),
    level: integer("Level"),
    pos: varchar("Part-of-Speech"),
  },
  
  (table) => ({
    levelRange: check(
      "level_range",
      sql`${table.level} BETWEEN 1 AND 5 OR ${table.level} IS NULL`
    ),
  })
);