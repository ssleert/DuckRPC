//@ts-ignore no-explicit-any
export type Client<T> = {
  [K in keyof T as T[K] extends (...args: any) => any ? K : never]: T[K] extends ( 
    ...args: infer Args
  ) => infer Return
    ? (...args: Args) => Promise<Return>
    : never;
};

export const newClient = async <T>(url: string) => {
  const metadataUrl = url + "/___reflect"
  const res = await fetch(metadataUrl)
  if (!res.ok) {
    throw new Error(
      `DuckRPC cant access reflect metadata on ${metadataUrl}`
    )
  }
  const metadata = await res.json() as Record<string, number>

  const clientHandlers = {} as Record<string, unknown>
  
  for (const methodName in metadata) {
    clientHandlers[methodName] = async (...args: unknown[]) => {
      const method = "POST"
      const body = JSON.stringify(args)
      const res = await fetch(url + "/" + methodName, { method, body })
      const result = await res.json()
      return result
    }
  }

  return clientHandlers as Client<T>
}
