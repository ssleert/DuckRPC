import uWS from "uWebSockets.js";
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

const app = uWS.App();
const port = 8000;

rpc.routes.forEach(
  (route) => app.post(route, rpc.getuWebSocketsHandler()),
);

rpc.addInterceptor((ctx, method, args) => {
  console.log(ctx.swag)
  return true;
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
