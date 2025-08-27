import * as duckrpc from "../src/client.ts";
import { NumberService } from "./testServer.ts";


(async () => {
  const numberService = await duckrpc.newClient<NumberService>(
    "http://localhost:8000"
  )

  console.time("asd")

    console.log(await numberService.greeting("asd"))
  console.timeEnd("asd")
})()

