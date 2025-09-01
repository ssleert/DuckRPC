import http from "node:http";
import { Buffer } from "node:buffer";
import * as duckrpc from "../src/server.ts";

class NumberService {
  greeting(name: string): string {
    return `Hello, ${name}!`;
  }

  add(a: number, b: number): number {
    return a + b;
  }
}

const service = new NumberService();
const rpc = new duckrpc.Server(service);

rpc.addInterceptor((ctx, method, args) => {
  console.log(ctx)
  console.log(method);
  return true;
});

const server = http.createServer(rpc.getNodeHandler());

server.listen(8000);
