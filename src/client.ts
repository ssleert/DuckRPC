type JsonCompatible<T> = T extends string | number | boolean | null ? T
  : T extends Date ? string
  : T extends Function | symbol | undefined ? never
  : T extends Array<infer U> ? JsonCompatible<U>[]
  : T extends object ? { [K in keyof T]: JsonCompatible<T[K]> }
  : never;

export type Client<T> = {
  [K in keyof T as T[K] extends (...args: any) => any ? K : never]: T[K] extends
    (
      ...args: infer Args
    ) => infer Return ? (...args: Args) => Promise<JsonCompatible<Return>>
    : never;
};

const ctxHeaderName = "duckrpc-ctx";

export type Interceptor = (
  ctx: Record<string, string>,
  method: string,
  args: unknown[],
) => Promise<boolean> | boolean;

export const newClient = async <T>(url: string, interceptors: Interceptor[] = []) => {
  const method = "POST";
  const keepalive = true;

  const metadataUrl = url + "/___reflect";
  const res = await fetch(metadataUrl, { method, keepalive });
  if (!res.ok) {
    throw new Error(
      `DuckRPC cant access reflect metadata on ${metadataUrl}`,
    );
  }
  const metadata = await res.json() as Record<string, number>;

  const clientHandlers = {} as Record<string, unknown>;

  for (const methodName in metadata) {
    clientHandlers[methodName] = async (...args: unknown[]) => {
      const ctx: Record<string, string> = {}
      for (const intr of interceptors) {
        if (!intr(ctx, method, args)) {
          break
        }
      }

      const headers = { 
        "Content-Type": "application/json",
        ctxHeaderName: JSON.stringify(ctx),
      };

      const body = JSON.stringify(args);
      const res = await fetch(url + "/" + methodName, {
        method,
        headers,
        body,
        keepalive,
      });
      const result = await res.json();

      const err = result["___e"] as string | undefined;
      if (err) {
        throw new Error(err);
      }
      return result;
    };
  }

  return clientHandlers as Client<T>;
};
