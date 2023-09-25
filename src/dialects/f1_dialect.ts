import { StandardSQLDialect } from "@malloydata/malloy/dist/dialect";

export class F1Dialect extends StandardSQLDialect {
    override name: string = "f1";
    override quoteTablePath(tablePath: string): string {
        return `${tablePath}`;
    }
}