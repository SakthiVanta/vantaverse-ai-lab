import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { retryOnTransientNetworkError } from "@/lib/retry";

const rawSql = neon(process.env.DATABASE_URL!);

// A Proxy so every other property Drizzle/Neon attach to the query
// function (e.g. transaction helpers) still pass through untouched —
// only the function-call path (every actual query) gets the retry.
const sql = new Proxy(rawSql, {
  apply(target, thisArg, args) {
    return retryOnTransientNetworkError(() => Reflect.apply(target, thisArg, args));
  },
}) as typeof rawSql;

export const db = drizzle({ client: sql, schema });
