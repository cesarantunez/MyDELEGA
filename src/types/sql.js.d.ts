declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: (string | number | null | Uint8Array)[]): Database
    exec(sql: string, params?: (string | number | null | Uint8Array)[]): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface Statement {
    bind(params?: (string | number | null | Uint8Array)[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    run(params?: (string | number | null | Uint8Array)[]): void
    free(): boolean
  }

  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
