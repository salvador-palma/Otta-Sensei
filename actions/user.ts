"use server"

import db from "@/db/drizzle";
import { getUser, getUserProgress } from "@/db/queries";
import { User, UserVocabProgress } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm/sql/expressions/conditions";
import { revalidatePath } from "next/cache";

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

export const updateVocabProgress = async (vocabId: number, correct: boolean) => {
    const { userId } = await auth();



    if (!userId) {
        throw new Error("User not authenticated");
    }

    const currentProgress = await getUserProgress(vocabId);

    if(currentProgress === null) {
        await db.insert(UserVocabProgress).values({
            user_ID: userId,
            vocab_ID: vocabId,

        })
        return;
    }

    let interval = 0;
    let repetition = 0;
    let easinessFactor = 2.5;
    let dueDate = new Date();

    

    

    await db.update(UserVocabProgress).set({
        interval: interval,
        repetition: repetition,
        easiness_factor: easinessFactor,
        due_date: dueDate
    }).where(and(eq(UserVocabProgress.user_ID, userId), eq(UserVocabProgress.vocab_ID, vocabId)))
}