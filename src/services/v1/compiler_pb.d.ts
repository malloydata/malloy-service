// package: malloy.services.v1
// file: services/v1/compiler.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class CompileRequest extends jspb.Message { 
    getType(): CompileRequest.Type;
    setType(value: CompileRequest.Type): CompileRequest;

    hasDocument(): boolean;
    clearDocument(): void;
    getDocument(): CompileDocument | undefined;
    setDocument(value?: CompileDocument): CompileRequest;
    clearReferencesList(): void;
    getReferencesList(): Array<CompileDocument>;
    setReferencesList(value: Array<CompileDocument>): CompileRequest;
    addReferences(value?: CompileDocument, index?: number): CompileDocument;
    getSchema(): string;
    setSchema(value: string): CompileRequest;
    clearSqlBlockSchemasList(): void;
    getSqlBlockSchemasList(): Array<SqlBlockSchema>;
    setSqlBlockSchemasList(value: Array<SqlBlockSchema>): CompileRequest;
    addSqlBlockSchemas(value?: SqlBlockSchema, index?: number): SqlBlockSchema;
    getQuery(): string;
    setQuery(value: string): CompileRequest;
    getNamedQuery(): string;
    setNamedQuery(value: string): CompileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CompileRequest): CompileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompileRequest;
    static deserializeBinaryFromReader(message: CompileRequest, reader: jspb.BinaryReader): CompileRequest;
}

export namespace CompileRequest {
    export type AsObject = {
        type: CompileRequest.Type,
        document?: CompileDocument.AsObject,
        referencesList: Array<CompileDocument.AsObject>,
        schema: string,
        sqlBlockSchemasList: Array<SqlBlockSchema.AsObject>,
        query: string,
        namedQuery: string,
    }

    export enum Type {
    COMPILE = 0,
    REFERENCES = 1,
    TABLE_SCHEMAS = 2,
    SQL_BLOCK_SCHEMAS = 3,
    }

}

export class CompileResponse extends jspb.Message { 
    getModel(): string;
    setModel(value: string): CompileResponse;
    getSql(): string;
    setSql(value: string): CompileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: CompileResponse): CompileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompileResponse;
    static deserializeBinaryFromReader(message: CompileResponse, reader: jspb.BinaryReader): CompileResponse;
}

export namespace CompileResponse {
    export type AsObject = {
        model: string,
        sql: string,
    }
}

export class CompileDocument extends jspb.Message { 
    getUrl(): string;
    setUrl(value: string): CompileDocument;
    getContent(): string;
    setContent(value: string): CompileDocument;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompileDocument.AsObject;
    static toObject(includeInstance: boolean, msg: CompileDocument): CompileDocument.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompileDocument, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompileDocument;
    static deserializeBinaryFromReader(message: CompileDocument, reader: jspb.BinaryReader): CompileDocument;
}

export namespace CompileDocument {
    export type AsObject = {
        url: string,
        content: string,
    }
}

export class CompilerRequest extends jspb.Message { 
    getType(): CompilerRequest.Type;
    setType(value: CompilerRequest.Type): CompilerRequest;
    clearImportUrlsList(): void;
    getImportUrlsList(): Array<string>;
    setImportUrlsList(value: Array<string>): CompilerRequest;
    addImportUrls(value: string, index?: number): string;
    clearTableSchemasList(): void;
    getTableSchemasList(): Array<string>;
    setTableSchemasList(value: Array<string>): CompilerRequest;
    addTableSchemas(value: string, index?: number): string;

    hasSqlBlock(): boolean;
    clearSqlBlock(): void;
    getSqlBlock(): SqlBlock | undefined;
    setSqlBlock(value?: SqlBlock): CompilerRequest;
    clearConnectionsList(): void;
    getConnectionsList(): Array<string>;
    setConnectionsList(value: Array<string>): CompilerRequest;
    addConnections(value: string, index?: number): string;
    getContent(): string;
    setContent(value: string): CompilerRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CompilerRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CompilerRequest): CompilerRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CompilerRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CompilerRequest;
    static deserializeBinaryFromReader(message: CompilerRequest, reader: jspb.BinaryReader): CompilerRequest;
}

export namespace CompilerRequest {
    export type AsObject = {
        type: CompilerRequest.Type,
        importUrlsList: Array<string>,
        tableSchemasList: Array<string>,
        sqlBlock?: SqlBlock.AsObject,
        connectionsList: Array<string>,
        content: string,
    }

    export enum Type {
    UNKNOWN = 0,
    IMPORT = 1,
    TABLE_SCHEMAS = 2,
    SQL_BLOCK_SCHEMAS = 3,
    COMPLETE = 4,
    }

}

export class SqlBlock extends jspb.Message { 
    getName(): string;
    setName(value: string): SqlBlock;
    getSql(): string;
    setSql(value: string): SqlBlock;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SqlBlock.AsObject;
    static toObject(includeInstance: boolean, msg: SqlBlock): SqlBlock.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SqlBlock, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SqlBlock;
    static deserializeBinaryFromReader(message: SqlBlock, reader: jspb.BinaryReader): SqlBlock;
}

export namespace SqlBlock {
    export type AsObject = {
        name: string,
        sql: string,
    }
}

export class SqlBlockSchema extends jspb.Message { 
    getName(): string;
    setName(value: string): SqlBlockSchema;
    getSql(): string;
    setSql(value: string): SqlBlockSchema;
    getSchema(): string;
    setSchema(value: string): SqlBlockSchema;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SqlBlockSchema.AsObject;
    static toObject(includeInstance: boolean, msg: SqlBlockSchema): SqlBlockSchema.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SqlBlockSchema, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SqlBlockSchema;
    static deserializeBinaryFromReader(message: SqlBlockSchema, reader: jspb.BinaryReader): SqlBlockSchema;
}

export namespace SqlBlockSchema {
    export type AsObject = {
        name: string,
        sql: string,
        schema: string,
    }
}
