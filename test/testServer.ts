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

export { NumberService };
export default {
  fetch: new duckrpc.Server(service).getFetch(),
};
