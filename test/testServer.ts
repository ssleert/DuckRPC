import * as duckrpc from "../index.ts";

class NumberService {
  add(a: number, b: number) {
    return a + b;
  }
}

const service = new NumberService();

export { NumberService }
export default {
  fetch: new duckrpc.Server(service).getFetch()
}
