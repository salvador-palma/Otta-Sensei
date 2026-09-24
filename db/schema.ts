import { relations, sql } from "drizzle-orm";
import { date, pgEnum, primaryKey, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable, serial, integer, varchar, text, check} from "drizzle-orm/pg-core";



export const User = pgTable("User", {
  user_ID: text("user_id").notNull().primaryKey(),
  user_name: text("user_name").notNull().default("User"),
  user_img_src: text("user_img_src").notNull().default("/mascot.svg"),

})

// Pronunciation problem a sentence targets. FLAP is checked with the fine-tuned
// XLSR model, the others with the Japanese Hubert model.
export const featureEnum = pgEnum("feature_type", ["GEMINATE", "FLAP", "LVOWEL", "DVOWEL"]);

export const Sentences = pgTable("Sentences", {
  id: serial("sentence_id").primaryKey(),
  jp_sentence: text("jp_sentence").notNull(),
  ipa_transcription: text("ipa_transcription").notNull(),
  level: integer("level").notNull(),
  feature: featureEnum("feature"),
});