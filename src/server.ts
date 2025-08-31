type UnknownFunction = (...args: unknown[]) => unknown;

type NodeBuffer = {
  length: number
  concat(bufs: Uint8Array<ArrayBufferLike>[] | NodeBuffer[]): NodeBuffer;
  toString(): string;
  from(buf: ArrayBufferLike): NodeBuffer
};

type NodeHttpReq = {
  url?: string;
  on(
    event: "data",
    cb: (data: Uint8Array<ArrayBufferLike>) => void,
  ): NodeHttpReq;
  on(event: "end", cb: () => void): NodeHttpReq;
};

type NodeHttpRes = {
  statusCode: number;
  end(body: string): void;
};

interface UwsReq {
  getUrl(): string;
}

interface UwsRes {
  aborted?: boolean | undefined
  onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void;
  writeStatus(status: string): UwsRes;
  end(body: string): void;
  onAborted(callback: () => void): void;
  cork(callback: () => void): void;
}

type ExpressReq = {
  url: string;
  body: unknown;
};

type ExpressRes = {
  status(code: number): ExpressRes;
  send(data: string): ExpressRes;
};

// https://stackoverflow.com/questions/37771418/iterate-through-methods-and-properties-of-an-es6-class
// its just copy paste code from answer
// it only runs on object construction not in hot paths
// dont flame on me please
const getClassMethodNames = (klass: unknown) => {
  if ((klass as Record<string, unknown>).prototype) {
    throw new Error("prototype field is undefined");
  }

  const isGetter = (obj: unknown, name: string): boolean =>
    !!Object.getOwnPropertyDescriptor(obj, name)?.get;
  const isFunction = (obj: unknown, name: string): boolean =>
    typeof (obj as Record<string, unknown>)[name] === "function";

  const deepFunctions = (obj: unknown): string[] =>
    obj !== Object.prototype
      ? Object.getOwnPropertyNames(obj)
        .filter((name) => isGetter(obj, name) || isFunction(obj, name))
        .concat(deepFunctions(Object.getPrototypeOf(obj)) || [])
      : [];
  const distinctDeepFunctions = (klass: unknown): string[] =>
    Array.from(new Set(deepFunctions(klass)));

  const allMethods: string[] =
    typeof (klass as Record<string, unknown>).prototype === "undefined"
      ? distinctDeepFunctions(klass)
      : Object.getOwnPropertyNames(
        (klass as Record<string, unknown>).prototype,
      );
  return allMethods.filter((name) =>
    name !== "constructor" && !name.startsWith("__")
  );
};

export class Server<T> {
  static reflectRoute = "___reflect";

  #instance: T;
  #reflectMetadata!: Record<string, number>;
  #reflectMetadataJSON!: string;
  #methodArgumentsMappers!: Record<string, UnknownFunction>;

  #nodeBuffer!: NodeBuffer

  constructor(
    instance: T,
  ) {
    if (typeof instance !== "object") {
      throw new TypeError("instance must be an object");
    }
    this.#instance = instance;
    this.#reflectMetadata = this.#getMethodNamesWithArgsCount();
    this.#reflectMetadataJSON = JSON.stringify(this.#reflectMetadata);
    this.#methodArgumentsMappers = this.#generateMethodArgumentsMapppers();

  }

  #loadNodeBuffer() {
    import("node:buffer").then(buffer => {
      this.#nodeBuffer = buffer.Buffer as unknown as NodeBuffer
    }).catch((e) => {
      console.error("Cant get NodeJS Buffer object.")
    })
  }

  get routes() {
    return [
      ...Object.keys(this.#reflectMetadata),
      Server.reflectRoute,
    ].map((r) => `/${r}`);
  }

  #getMethodNamesWithArgsCount() {
    const methodNamesWithArgsCount: Record<string, number> = {};
    for (const key of getClassMethodNames(this.#instance) as string[]) {
      if (
        typeof (this.#instance as Record<string, UnknownFunction>)[key] ===
          "function"
      ) {
        methodNamesWithArgsCount[key] =
          (this.#instance as Record<string, UnknownFunction>)[key].length;
      }
    }
    return methodNamesWithArgsCount;
  }

  #generateMethodArgumentsMapppers() {
    const nameWrappers: Record<string, UnknownFunction> = {};

    for (const methodName in this.#reflectMetadata) {
      const argumentsLen = this.#reflectMetadata[methodName];
      if (argumentsLen === 0) {
        nameWrappers[methodName] = () => {
          return (this.#instance as Record<string, UnknownFunction>)
            [methodName]();
        };
        continue;
      }

      const argsNames: string[] = [];
      for (let i = 0; i < argumentsLen; i++) {
        argsNames.push(`args[${i}]`);
      }

      const fnStr = `(args) => {
        return this.#instance.${methodName}(${argsNames.join(", ")})
      }`;

      const fnValue = eval(`(${fnStr})`).bind(this);
      nameWrappers[methodName] = fnValue;
    }

    return nameWrappers;
  }

  async callMethod(
    method: string,
    args: unknown[],
  ): Promise<[unknown, number]> {
    try {
      const r = await this.#methodArgumentsMappers[method](args);
      return [r, 200];
    } catch (e) {
      return [{ ___e: (e as Error).message }, 500];
    }
  }

  getFetch() {
    return async (req: Request) => {
      const method = req.url.split("/").at(-1) as string;

      if (method === Server.reflectRoute) {
        return new Response(this.#reflectMetadataJSON);
      }

      const args = await req.json();

      const [body, status] = await this.callMethod(method, args);
      return new Response(JSON.stringify(body), { status, headers: {} });
    };
  }

  get fetch() {
    return this.getFetch();
  }

  getExpressHandler(bodyText = false) {
    const getBody = bodyText 
      ? (body: string) => JSON.parse(body) 
      : (body: unknown) => body

    return async (req: ExpressReq, res: ExpressRes) => {
      const method = req.url.split("/").at(-1) as string;

      if (method === Server.reflectRoute) {
        res.send(this.#reflectMetadataJSON);
        return;
      }

      const args = getBody(req.body as string);
      const [body, status] = await this.callMethod(method, args);

      res.status(status)
      res.send(
        JSON.stringify(body),
      );
    };
  }

  getNodeHandler() {
    if (!this.#nodeBuffer) {
      this.#loadNodeBuffer() 
    }

    return async (req: NodeHttpReq, res: NodeHttpRes) => {
      try {
        const method = req.url?.split("/").at(-1) as string;

        if (method === Server.reflectRoute) {
          res.end(this.#reflectMetadataJSON);
          return;
        }

        const args: unknown[] = await (new Promise((resolve, reject) => {
          const body: Uint8Array<ArrayBufferLike>[] = [];
          req.on("data", (chunk) => {
            body.push(chunk);
          }).on("end", () => {
            try {
              resolve(
                JSON.parse(
                  this.#nodeBuffer.concat(body).toString(),
                ),
              );
            } catch(e) {
              reject(e)
            }
          });
        }));

        const [body, status] = await this.callMethod(method, args);

        res.statusCode = status;
        res.end(
          JSON.stringify(body),
        );
      } catch(e) {
        console.error(e)
      }
    };
  }

  getuWebSocketsHandler() {
    if (!this.#nodeBuffer) {
      this.#loadNodeBuffer();
    }

    return async (res: UwsRes, req: UwsReq) => {
      const method = req.getUrl().split("/").at(-1) as string;
      if (method === Server.reflectRoute) {
        res.cork(() => {
          res.end(this.#reflectMetadataJSON);
        })
        return;
      }

      res.onAborted(() => {
        res.aborted = true;
      });

      try {
        const args: unknown[] = await new Promise((resolve, reject) => {
          let buffer: NodeBuffer | undefined;
          res.onData((chunk: ArrayBuffer, isLast: boolean) => {
            if (res.aborted) {
              reject(new Error("Request Aborted"))
            }

            const currentChunk = this.#nodeBuffer.from(chunk);
            buffer = buffer ? this.#nodeBuffer.concat([buffer, currentChunk]) : currentChunk;

            if (isLast) {
              try {
                resolve(JSON.parse(buffer.toString()));
              } catch (e) {
                reject(new Error('Invalid JSON payload'));
              }
            }
          });
        });

        const [body, status] = await this.callMethod(method, args);

        if (res.aborted) {
          return
        }

        res.cork(() => {
          res.writeStatus(status.toString());
          res.end(JSON.stringify(body));
        })
      } catch (e) {
        console.error(e)
      }
    };
  }
}
