type UnknownFunction = (...args: unknown[]) => unknown;

// https://stackoverflow.com/questions/37771418/iterate-through-methods-and-properties-of-an-es6-class
// its just copy paste code from answer
// but rewritten to ts
// it only runs on object construction not in hot paths
// dont flame on me please
const getClassMethodNames = (klass: unknown) => {
    if ((klass as Record<string, unknown>).prototype) {
      throw new Error("prototype field is undefined")
    }

    const isGetter = (obj: unknown, name: string): boolean => !!Object.getOwnPropertyDescriptor(obj, name)?.get;
    const isFunction = (obj: unknown, name: string): boolean => 
      typeof (obj as Record<string, unknown>)[name] === 'function';

    const deepFunctions = (obj: unknown): string[] =>
        obj !== Object.prototype
            ? Object.getOwnPropertyNames(obj)
                  .filter(name => isGetter(obj, name) || isFunction(obj, name))
                  .concat(deepFunctions(Object.getPrototypeOf(obj)) || [])
            : [];
    const distinctDeepFunctions = (klass: unknown): string[] => Array.from(new Set(deepFunctions(klass)));

    const allMethods: string[] =
        typeof (klass as Record<string, unknown>).prototype === 'undefined'
            ? distinctDeepFunctions(klass)
            : Object.getOwnPropertyNames((klass as Record<string, unknown>).prototype);
    return allMethods.filter(name => name !== 'constructor' && !name.startsWith('__'));
}

class Server<T> {
  #instance: T;
  #reflectMetadata!: Record<string, number>
  #reflectMetadataJSON!: string

  constructor(
    instance: T
  ) {
    if (typeof instance !== 'object') {
      throw new TypeError('instance must be an object')
    }
    this.#instance = instance;
    this.#reflectMetadata = this.getMethodNamesWithArgsCount()
    console.trace(this.#reflectMetadata)
    this.#reflectMetadataJSON = JSON.stringify(this.#reflectMetadata)
  }

  getMethodNamesWithArgsCount(): Record<string, number> {
    const methodNamesWithArgsCount: Record<string, number> = {}
    for (const key of getClassMethodNames(this.#instance) as string[]) {
      if (typeof (this.#instance as Record<string, UnknownFunction>)[key] === 'function') {
        methodNamesWithArgsCount[key] = (this.#instance as Record<string, UnknownFunction>)[key].length
      }
    }
    return methodNamesWithArgsCount
  }

  async callMethod(method: string, args: unknown[]): Promise<[unknown, number]> {
    try {
      const r = await (
        this.#instance as Record<string, UnknownFunction>
      )[method](...args)
      return [r, 200]
    } catch (e) {
      return [{__e: (e as Error).message}, 500]
    }
  }

  async fetch(req: Request): Promise<Response> {
    const method = req.url.split('/').at(-1) as string

    if (method === "___reflect") {
      return new Response(this.#reflectMetadataJSON)
    }

    const args = await req.json()

    const [body, status] = await this.callMethod(method, args)
    return new Response(JSON.stringify(body), { status })
  }

  getFetch() {
    return this.fetch.bind(this)
  }
};

export default Server;
