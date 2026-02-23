import { cache } from "react";
import db from "./drizzle"
import { and, eq, ne, inArray, isNull, lte, count, countDistinct } from "drizzle-orm";
import { User, UserVocabProgress, Vocab, VocabReferences } from "./schema";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@clerk/nextjs/server";
import { today } from "@/lib/utils";

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


export const getTrainableVocab = cache(async (lvl: number) => {

  const user = await getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const DailyLimit = 20;

  const RefVocab = alias(Vocab, "RefVocab");
  const OgVocab = alias(Vocab, "OgVocab");


  const userProgressSubquery = await db
    .select()
    .from(UserVocabProgress)
    .where(eq(UserVocabProgress.user_ID, user.user_ID))
    .as('UserProgress');

  const new_cards_activated_today = (await db
    .select({total: count()})
    .from(userProgressSubquery)
    .where(eq(userProgressSubquery.activation_date, today())))[0].total;

 


  const review_cards = await db
    .select()
    .from(OgVocab)
    .leftJoin(VocabReferences, eq(OgVocab.kanji, VocabReferences.parentID))
    .leftJoin(RefVocab, eq(VocabReferences.childID, RefVocab.kanji))
    .innerJoin(userProgressSubquery, eq(userProgressSubquery.vocab_ID, OgVocab.id))
    .where(and(eq(OgVocab.level, lvl), lte(userProgressSubquery.due_date, new Date()), ne(userProgressSubquery.stage, "new")))
    .orderBy(OgVocab.id);

  const new_Cards = await db
    .select()
    .from(OgVocab)
    .leftJoin(VocabReferences, eq(OgVocab.kanji, VocabReferences.parentID))
    .leftJoin(RefVocab, eq(VocabReferences.childID, RefVocab.kanji))
    .leftJoin(userProgressSubquery, eq(userProgressSubquery.vocab_ID, OgVocab.id))
    .where(and(eq(OgVocab.level, lvl), eq(userProgressSubquery.stage, "new")))
    .orderBy(OgVocab.id)


  const new_vocabMap: [typeof Vocab.$inferInsert, typeof Vocab.$inferInsert[], typeof UserVocabProgress.$inferSelect | null][] = [];
  const review_vocabMap: [typeof Vocab.$inferInsert, typeof Vocab.$inferInsert[], typeof UserVocabProgress.$inferSelect | null][] = [];


  review_cards.forEach(row => {
    const parent = row.OgVocab;
    const child = row.RefVocab;
    const userProgress = row.UserProgress;
    const existingEntry = review_vocabMap.find(([v]) => v.id === parent.id);

    if (existingEntry) {
      if (child) {
        existingEntry[1].push(child);
      }
    } else {
      review_vocabMap.push([parent, child ? [child] : [], userProgress]);
    }
  });

  new_Cards.forEach(row => {
    const parent = row.OgVocab;
    const child = row.RefVocab;
    const userProgress = row.UserProgress;
    const existingEntry = new_vocabMap.find(([v]) => v.id === parent.id);

    if (existingEntry) {
      if (child) {
        existingEntry[1].push(child);
      }
    } else {
      new_vocabMap.push([parent, child ? [child] : [], userProgress]);
    }
  });
  const available_Cards = [...review_vocabMap, ...new_vocabMap.slice(0, DailyLimit - new_cards_activated_today)]
  console.log("Cards available for level", lvl, available_Cards.length);
  return available_Cards;
});


export const getVocabState = cache(async (lvl: number) => {
  const user = await getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const result = await db.select({
    state: UserVocabProgress.stage,
    amount: count(UserVocabProgress.stage)
  }).from(UserVocabProgress)
    .innerJoin(Vocab, eq(UserVocabProgress.vocab_ID, Vocab.id))
    .where(and(eq(UserVocabProgress.user_ID, user.user_ID), eq(Vocab.level, lvl)))
    .groupBy(UserVocabProgress.stage)

  const resultMap: Record<string, number> = {};
  result.forEach(r => {
    resultMap[r.state] = Number(r.amount);
  }
  );
  return resultMap;

})

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

  try {
    const results = await db
      .select()
      .from(UserVocabProgress)
      .where(
        and(
          eq(UserVocabProgress.user_ID, userId),
          eq(UserVocabProgress.vocab_ID, id)
        )
      )
      .limit(1);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }

})
