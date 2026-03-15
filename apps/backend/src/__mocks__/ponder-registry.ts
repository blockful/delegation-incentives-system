// Mock for ponder:registry used in unit tests
export const ponder = {
  on: (_event: string, _handler: any) => {},
}

export type Context = {
  db: any
}
export type EventNames = string
export type IndexingFunctionArgs<T = string> = { event: any; context: Context }
