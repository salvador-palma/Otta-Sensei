import "dotenv/config";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

import * as schema from "../db/schema"

const sqlClient = neon(process.env.DATABASE_URL!)

//@ts-ignore
const db = drizzle(sqlClient, { schema })

const main = async () => {
    try {

        const file = fs.readFileSync("./scripts/output.csv");

        const records = parse(file, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ";",
            bom: true,
        });

        const seen = new Set<string>();
        const deduped = records.filter((row: any) => {
            const key = `${row.kanji}__${row.hiragana}`;

            if (!row.kanji || !row.hiragana) return false;

            if (seen.has(key)) return false;

            seen.add(key);
            return true;
        });

        const formatted = deduped.map((row: any, index: number) => {
            const parsedLevel = Number(row.jlpt);

            return {
                vocab_id: index + 1,
                kanji: row.kanji,
                hiragana: row.hiragana,
                meaning: row.meaning,
                pos: row.pos,
                level: Number.isNaN(parsedLevel) ? null : parsedLevel,
                sentenceEN: row.sentenceEN,
                sentenceJP: row.sentenceJP,
                meaning2: row.meaning2 || null,
                pos2: row.pos2 || null,
                meaning3: row.meaning3 || null,
                pos3: row.pos3 || null,
                meaning4: row.meaning4 || null,
                pos4: row.pos4 || null,
            };
        });

        const relations = deduped.flatMap((row: any) => {
            const refKeys = ['ref1', 'ref2', 'ref3'];

            return refKeys
                .filter(key => row[key] && row[key] !== "")
                .map(key => ({
                    parentID: row.kanji,
                    childID: row[key],
                }));
        });
        const uniqueRelations = relations.filter((rel, index, self) =>
            index === self.findIndex((t) => (
                t.parentID === rel.parentID && t.childID === rel.childID
            ))
        );


        console.log("Seeding database...")
        await db.delete(schema.VocabReferences);
        await db.delete(schema.UserVocabProgress);
        await db.delete(schema.Vocab);
        await db.delete(schema.User);
        await db.execute(sql`ALTER SEQUENCE "Vocabulary_VocabID_seq" RESTART WITH 1;`)

        

        const BATCH_SIZE = 500;

        for (let i = 0; i < formatted.length; i += BATCH_SIZE) {
            await db.insert(schema.Vocab).values(
                formatted.slice(i, i + BATCH_SIZE)
            );
        }

        for (let i = 0; i < uniqueRelations.length; i += BATCH_SIZE) {
            await db.insert(schema.VocabReferences).values(
                uniqueRelations.slice(i, i + BATCH_SIZE)
            );
        }


        console.log("Database seeded successfully!")


    } catch (error) {
        console.error("Error seeding database:", error)
        throw new Error("Error seeding database")
    }
}

main();