import * as duckrpc from "../client.ts";
import { NumberService } from "./testServer.ts";

const numberService = await duckrpc.newClient<NumberService>(
  "http://localhost:8000"
)

const a = 1
const b = 2

const ab = await numberService.add(a, b)

console.log(ab)
