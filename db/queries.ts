import { cache } from "react";
import db from "./drizzle"
import { and, eq, inArray, sql } from "drizzle-orm";
import { User, UserVocabProgress, Vocab, VocabReferences } from "./schema";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@clerk/nextjs/server";

export const getVocab = cache(async (id: number) => {
  const data = await db.query.Vocab.findFirst({
    where: eq(Vocab.id, id),
  });

  return data;
});

export const getReferences = cache(async (vocab?: typeof Vocab.$inferSelect) => {

  if (!vocab) return [];
  const refs = await db.query.VocabReferences.findMany({
    where: eq(VocabReferences.parentID, vocab.kanji),
    columns: {
      childID: true,
    },
  });

  const childIds = refs.map(r => r.childID);

  if (childIds.length === 0) return [];

  const vocabEntries = await db.query.Vocab.findMany({
    where: inArray(Vocab.kanji, childIds),
  });

  return vocabEntries;
});


//TODO: link to user progress table
export const getTrainableVocab = cache(async (lvl: number) => {
  const RefVocab = alias(Vocab, "RefVocab");
  const OgVocab = alias(Vocab, "OgVocab");

  const rows = await db
    .select()
    .from(OgVocab)
    .leftJoin(VocabReferences, eq(OgVocab.kanji, VocabReferences.parentID))
    .leftJoin(RefVocab, eq(VocabReferences.childID, RefVocab.kanji))
    .where(eq(OgVocab.level, lvl))
    .orderBy(OgVocab.id)


  const vocabMap: [typeof Vocab.$inferInsert, typeof Vocab.$inferInsert[]][] = [];

  rows.forEach(row => {
    const parent = row.OgVocab;
    const child = row.RefVocab;
    const existingEntry = vocabMap.find(([v]) => v.id === parent.id);

    if (existingEntry) {
      if (child) {
        existingEntry[1].push(child);
      }
    } else {
      vocabMap.push([parent, child ? [child] : []]);
    }
  });

  return vocabMap;
});


export const getUser = cache(async () => {
  const { userId } = await auth();

  if (!userId) return null;

  const user = await db.query.User.findFirst({
    where: eq(User.user_ID, userId)
  })

  return user;

})


export const getUserProgress = cache(async (id: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const progress = await db.query.UserVocabProgress.findFirst({
    where: and(eq(UserVocabProgress.user_ID, userId), eq(UserVocabProgress.vocab_ID, id))
  })

  return progress;

})