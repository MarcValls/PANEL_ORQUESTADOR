type Collection<T> = Map<string, T>

type InMemoryDB = {
  getCollection: <T>(name: string) => Collection<T>
  put: <T extends { id: string }>(collection: string, item: T) => void
  get: <T>(collection: string, id: string) => T | undefined
  getAll: <T>(collection: string) => T[]
  remove: (collection: string, id: string) => void
}

function createInMemoryDB(): InMemoryDB {
  const collections: Map<string, Collection<unknown>> = new Map()

  const getCollection = <T>(name: string): Collection<T> => {
    if (!collections.has(name)) {
      collections.set(name, new Map())
    }
    return collections.get(name) as Collection<T>
  }

  return {
    getCollection,
    put: <T extends { id: string }>(collection: string, item: T): void => {
      getCollection<T>(collection).set(item.id, item)
    },
    get: <T>(collection: string, id: string): T | undefined => {
      return getCollection<T>(collection).get(id)
    },
    getAll: <T>(collection: string): T[] => {
      return Array.from(getCollection<T>(collection).values())
    },
    remove: (collection: string, id: string): void => {
      getCollection(collection).delete(id)
    },
  }
}

export const db = createInMemoryDB()
