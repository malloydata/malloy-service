// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var services_v1_compiler_pb = require('../../services/v1/compiler_pb.js');

function serialize_malloy_services_v1_CompileRequest(arg) {
  if (!(arg instanceof services_v1_compiler_pb.CompileRequest)) {
    throw new Error('Expected argument of type malloy.services.v1.CompileRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_malloy_services_v1_CompileRequest(buffer_arg) {
  return services_v1_compiler_pb.CompileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_malloy_services_v1_CompileResponse(arg) {
  if (!(arg instanceof services_v1_compiler_pb.CompileResponse)) {
    throw new Error('Expected argument of type malloy.services.v1.CompileResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_malloy_services_v1_CompileResponse(buffer_arg) {
  return services_v1_compiler_pb.CompileResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_malloy_services_v1_CompilerRequest(arg) {
  if (!(arg instanceof services_v1_compiler_pb.CompilerRequest)) {
    throw new Error('Expected argument of type malloy.services.v1.CompilerRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_malloy_services_v1_CompilerRequest(buffer_arg) {
  return services_v1_compiler_pb.CompilerRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var CompilerService = exports.CompilerService = {
  compile: {
    path: '/malloy.services.v1.Compiler/Compile',
    requestStream: false,
    responseStream: false,
    requestType: services_v1_compiler_pb.CompileRequest,
    responseType: services_v1_compiler_pb.CompileResponse,
    requestSerialize: serialize_malloy_services_v1_CompileRequest,
    requestDeserialize: deserialize_malloy_services_v1_CompileRequest,
    responseSerialize: serialize_malloy_services_v1_CompileResponse,
    responseDeserialize: deserialize_malloy_services_v1_CompileResponse,
  },
  compileStream: {
    path: '/malloy.services.v1.Compiler/CompileStream',
    requestStream: true,
    responseStream: true,
    requestType: services_v1_compiler_pb.CompileRequest,
    responseType: services_v1_compiler_pb.CompilerRequest,
    requestSerialize: serialize_malloy_services_v1_CompileRequest,
    requestDeserialize: deserialize_malloy_services_v1_CompileRequest,
    responseSerialize: serialize_malloy_services_v1_CompilerRequest,
    responseDeserialize: deserialize_malloy_services_v1_CompilerRequest,
  },
};

exports.CompilerClient = grpc.makeGenericClientConstructor(CompilerService);
