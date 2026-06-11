"use server"

import db from "@/db/drizzle";
import { getUser, getUserProgress } from "@/db/queries";
import { User, UserVocabProgress, Vocab } from "@/db/schema";
import { today } from "@/lib/utils";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm/sql/expressions/conditions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";



export const upsertUser = async () => {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        throw new Error("User not authenticated");
    }

    const existingUser = await getUser();

    if (!existingUser) {
        console.log("Inserting new user with ID:", userId);
        await db.insert(User).values({

            user_ID: userId,
            user_name: user.firstName || "User",
            user_img_src: user.imageUrl || "/mascot.svg"

        })
    } else {
        console.log("Updating existing user with ID:", existingUser);
        await db.update(User).set({

            user_name: user.firstName || "User",
            user_img_src: user.imageUrl || "/mascot.svg"

        }).where(eq(User.user_ID, userId))
    }
}

export const updateVocabProgress = async (progress: typeof UserVocabProgress.$inferSelect) => {

    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        throw new Error("User not authenticated");
    }

    const existingProgress = await getUserProgress(progress.vocab_ID);

    if (existingProgress) {

        console.log("Updating vocab progress for user ID:", userId, "and vocab ID:", progress.vocab_ID);
        await db.update(UserVocabProgress).set({
            interval: progress.interval,
            repetition: progress.repetition,
            easiness_factor: progress.easiness_factor,
            stage: progress.stage,
            due_date: progress.due_date,
            activation_date: progress.activation_date

        }).where(
            and(
                eq(UserVocabProgress.user_ID, userId),
                eq(UserVocabProgress.vocab_ID, progress.vocab_ID)
            )
        );
    } else {
        console.log("Inserting new vocab progress for user ID:", userId, "and vocab ID:", progress.vocab_ID);
        await db.insert(UserVocabProgress).values({
            user_ID: userId,
            vocab_ID: progress.vocab_ID,
            interval: progress.interval,
            repetition: progress.repetition,
            easiness_factor: progress.easiness_factor,
            stage: progress.stage,
            due_date: progress.due_date,
            activation_date: progress.activation_date
        })
    }

    revalidatePath("/vocab")
}


export const upsertUserProgress = async (level: number) => {

    const user = await getUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    const missingVocab = await db
        .select({
            id: Vocab.id,
        })
        .from(Vocab)
        .leftJoin(
            UserVocabProgress,
            and(
                eq(UserVocabProgress.vocab_ID, Vocab.id),
                eq(UserVocabProgress.user_ID, user.user_ID)
            )
        )
        .where(
            and(
                eq(Vocab.level, level),
                isNull(UserVocabProgress.vocab_ID)
            )
        );

    if (missingVocab.length > 0) {
        const entriesToInsert = missingVocab.map((v) => ({
            user_ID: user.user_ID,
            vocab_ID: v.id,
            stage: "new" as const,
            interval: 0,
            repetition: 0,
            easiness_factor: 2.5,
            due_date: addDays(0),
        }));

        await db.insert(UserVocabProgress).values(entriesToInsert);
        
        console.log(`Initialized ${missingVocab.length} new cards for level ${level}`);
    }

    // redirect(`/vocab/n${level}`);


}

function addDays(days: number) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date
}

