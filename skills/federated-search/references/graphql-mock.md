# Quick GraphQL Mock Server for Federated Search

A minimal Node.js GraphQL server serving static JSON data. Useful for
prototyping the frontend without a real backend. Each entity type is a
separate query — mirroring the federated search pattern where the frontend
fires N parallel requests.

## Setup

```bash
mkdir search-mock && cd search-mock
npm init -y
npm i @apollo/server graphql
```

## Schema + server in one file

```js
// server.js
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

// --- Static data (replace with your domain) ---

const vehicles = [
  { id: 'v1', name: 'Oslo Tram 11', plate: 'AB12345', type: 'TRAM' },
  { id: 'v2', name: 'Oslo Bus 31', plate: 'CD67890', type: 'BUS' },
  { id: 'v3', name: 'Bergen Light Rail', plate: 'EF11111', type: 'TRAM' },
  { id: 'v4', name: 'Trondheim Bus 5', plate: 'GH22222', type: 'BUS' },
]

const routes = [
  { id: 'r1', name: 'Oslo S - Majorstuen', line: '11', mode: 'TRAM' },
  { id: 'r2', name: 'Oslo S - Fornebu', line: '31', mode: 'BUS' },
  { id: 'r3', name: 'Bergen - Flesland', line: '1', mode: 'LIGHT_RAIL' },
]

const operators = [
  { id: 'o1', name: 'Ruter', code: 'RUT' },
  { id: 'o2', name: 'Skyss', code: 'SKY' },
  { id: 'o3', name: 'AtB', code: 'ATB' },
]

// --- Schema ---

const typeDefs = `#graphql
  type Vehicle { id: ID!, name: String!, plate: String!, type: String! }
  type Route   { id: ID!, name: String!, line: String!, mode: String! }
  type Operator { id: ID!, name: String!, code: String! }

  type Query {
    searchVehicles(q: String!, limit: Int = 5): [Vehicle!]!
    searchRoutes(q: String!, limit: Int = 5): [Route!]!
    searchOperators(q: String!, limit: Int = 5): [Operator!]!
  }
`

// --- Resolvers ---

const match = (fields, q) => item =>
  fields.some(f => item[f].toLowerCase().includes(q.toLowerCase()))

const resolvers = {
  Query: {
    searchVehicles: (_, { q, limit }) =>
      vehicles.filter(match(['name', 'plate'], q)).slice(0, limit),
    searchRoutes: (_, { q, limit }) =>
      routes.filter(match(['name', 'line'], q)).slice(0, limit),
    searchOperators: (_, { q, limit }) =>
      operators.filter(match(['name', 'code'], q)).slice(0, limit),
  },
}

// --- Start ---

const srv = new ApolloServer({ typeDefs, resolvers })
const { url } = await startStandaloneServer(srv, { listen: { port: 4000 } })
console.log(`Mock search API at ${url}`)
```

Add `"type": "module"` to package.json, then:

```bash
node server.js
```

Apollo Sandbox opens at `http://localhost:4000` for interactive queries.

## Example query (what the frontend fires in parallel)

```graphql
# These three run as separate requests, not one batched query,
# so each group can render as soon as its response arrives.

# Request 1
query SearchVehicles($q: String!) {
  searchVehicles(q: $q, limit: 5) { id name plate type }
}

# Request 2
query SearchRoutes($q: String!) {
  searchRoutes(q: $q, limit: 5) { id name line mode }
}

# Request 3
query SearchOperators($q: String!) {
  searchOperators(q: $q, limit: 5) { id name code }
}
```

Variables: `{ "q": "oslo" }`

## Simulating slow responses

Add artificial delay to test the lazy-loading UX:

```js
const delay = ms => new Promise(r => setTimeout(r, ms))

const resolvers = {
  Query: {
    searchVehicles: async (_, { q, limit }) => {
      await delay(100)  // fast
      return vehicles.filter(match(['name', 'plate'], q)).slice(0, limit)
    },
    searchRoutes: async (_, { q, limit }) => {
      await delay(800)  // slow — tests skeleton/suspense
      return routes.filter(match(['name', 'line'], q)).slice(0, limit)
    },
    searchOperators: async (_, { q, limit }) => {
      await delay(300)  // medium
      return operators.filter(match(['name', 'code'], q)).slice(0, limit)
    },
  },
}
```

This lets you see groups appear one by one — vehicles first, then
operators, then routes — validating that your Suspense boundaries
and loading states work correctly.

## React hooks (client side)

Using Apollo Client with separate queries per group:

```tsx
const SEARCH_VEHICLES = gql`
  query SearchVehicles($q: String!) {
    searchVehicles(q: $q, limit: 5) { id name plate type }
  }
`

function useSearchSources(query: string) {
  const skip = query.length < 2
  const vehicles = useQuery(SEARCH_VEHICLES, { variables: { q: query }, skip })
  const routes = useQuery(SEARCH_ROUTES, { variables: { q: query }, skip })
  const operators = useQuery(SEARCH_OPERATORS, { variables: { q: query }, skip })

  return [
    { label: 'Vehicles', ...vehicles },
    { label: 'Routes', ...routes },
    { label: 'Operators', ...operators },
  ]
}
```

Each `useQuery` fires independently — Apollo Client handles caching
and dedup. The component re-renders as each response arrives, which
maps perfectly to the per-group Suspense pattern.
