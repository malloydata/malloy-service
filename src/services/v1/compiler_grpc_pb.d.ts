// package: malloy.services.v1
// file: services/v1/compiler.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "grpc";
import * as services_v1_compiler_pb from "../../services/v1/compiler_pb";

interface ICompilerService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    compile: ICompilerService_ICompile;
    compileStream: ICompilerService_ICompileStream;
}

interface ICompilerService_ICompile extends grpc.MethodDefinition<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompileResponse> {
    path: "/malloy.services.v1.Compiler/Compile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_v1_compiler_pb.CompileRequest>;
    requestDeserialize: grpc.deserialize<services_v1_compiler_pb.CompileRequest>;
    responseSerialize: grpc.serialize<services_v1_compiler_pb.CompileResponse>;
    responseDeserialize: grpc.deserialize<services_v1_compiler_pb.CompileResponse>;
}
interface ICompilerService_ICompileStream extends grpc.MethodDefinition<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest> {
    path: "/malloy.services.v1.Compiler/CompileStream";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<services_v1_compiler_pb.CompileRequest>;
    requestDeserialize: grpc.deserialize<services_v1_compiler_pb.CompileRequest>;
    responseSerialize: grpc.serialize<services_v1_compiler_pb.CompilerRequest>;
    responseDeserialize: grpc.deserialize<services_v1_compiler_pb.CompilerRequest>;
}

export const CompilerService: ICompilerService;

export interface ICompilerServer {
    compile: grpc.handleUnaryCall<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompileResponse>;
    compileStream: grpc.handleBidiStreamingCall<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
}

export interface ICompilerClient {
    compile(request: services_v1_compiler_pb.CompileRequest, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    compile(request: services_v1_compiler_pb.CompileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    compile(request: services_v1_compiler_pb.CompileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    compileStream(): grpc.ClientDuplexStream<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
    compileStream(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
    compileStream(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
}

export class CompilerClient extends grpc.Client implements ICompilerClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public compile(request: services_v1_compiler_pb.CompileRequest, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    public compile(request: services_v1_compiler_pb.CompileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    public compile(request: services_v1_compiler_pb.CompileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_v1_compiler_pb.CompileResponse) => void): grpc.ClientUnaryCall;
    public compileStream(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
    public compileStream(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<services_v1_compiler_pb.CompileRequest, services_v1_compiler_pb.CompilerRequest>;
}
