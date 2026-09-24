"use server"

import db from "@/db/drizzle";
import { getUser } from "@/db/queries";
import { User} from "@/db/schema";
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




