<div align="center">

# DuckRPC 🦆
### Lightning Fast RPC Library for `NodeJS`, `Bun`, `Deno`, `Cloudflare Workers` and other serverless platform
</div>

## Examples ⚙️
### Server
```typescript
import * as duckrpc from "duckrpc/server";

export class GreetingService {
  greeting(name: string) {
    return `Hello, ${name}!`;
  }
}

const service = new GreetingService();
const rpc = new duckrpc.Server(service)

export default {
  fetch: rpc.getFetch(),
};
```

### Client
```typescript
import * as duckrpc from "duckrpc/client";
import { GreetingService } from "./server.ts";

const greetingService = await duckrpc.newClient<GreetingService>(
  "http://localhost:8000",
);

console.log(await greetingService.greeting("asd"));
```
