import express from "express"
import bodyParser from "body-parser"
import * as duckrpc from "../src/server.ts"

class NumberService {
  greeting(name: string): string {
    return `Hello, ${name}!`;
  }

  add(a: number, b: number): number {
    return a + b;
  }
}

const service = new NumberService()
const rpc = new duckrpc.Server(service)

const app = express()
const port = 8000

app.post(rpc.routes, bodyParser.json(), rpc.getExpressHandler())

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
