import * as duckrpc from "../src/server.ts";

export class NumberService {
  greeting(name: string): string {
    return `Hello, ${name}!`;
  }

  add(a: number, b: number) {
    return a + b;
  }
}

const service = new NumberService();
const rpc = new duckrpc.Server(service);

rpc.addInterceptor(async (ctx, method, args) => {
  console.log(ctx)
  console.log(method);
  return true;
});

export default {
  fetch: rpc.getFetch(),
};
