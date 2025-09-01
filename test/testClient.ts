import * as duckrpc from "../src/client.ts";
import { NumberService } from "./testServer.ts";

(async () => {
  const numberService = await duckrpc.newClient<NumberService>(
    "http://localhost:8000", [(ctx) => {
      ctx.swag = "asd"
      return true
    }]
  );

  console.time("asd");

  console.log(await numberService.greeting("asd"));

  console.timeEnd("asd");
})();
