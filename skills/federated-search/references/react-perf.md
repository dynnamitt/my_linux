# React Performance Patterns for Federated Search

Cherry-picked from [Vercel React Best Practices](https://github.com/vercel-labs/react-best-practices).
Each section maps to a specific rule ID.

## 1. Parallel async requests (`async-parallel`, CRITICAL)

Fire all source queries concurrently. Sequential fetches create waterfalls
that make the dropdown feel sluggish.

```tsx
// Bad: sequential — each source waits for the previous
const vehicles = await fetchVehicles(query)
const routes = await fetchRoutes(query)
const operators = await fetchOperators(query)

// Good: parallel — all sources fire at once
const [vehicles, routes, operators] = await Promise.all([
  fetchVehicles(query),
  fetchRoutes(query),
  fetchOperators(query),
])
```

With React Query / SWR, parallelism is automatic — each hook fires
independently:

```tsx
function useSearchSources(query: string) {
  const vehicles = useQuery({ queryKey: ['vehicles', query], queryFn: () => searchVehicles(query) })
  const routes = useQuery({ queryKey: ['routes', query], queryFn: () => searchRoutes(query) })
  const operators = useQuery({ queryKey: ['operators', query], queryFn: () => searchOperators(query) })
  return { vehicles, routes, operators }
}
```

## 2. Partial dependencies (`async-dependencies`, CRITICAL)

When some sources depend on others (e.g., fetch org first, then filter
vehicles by org), use promise chaining to start independent work early:

```tsx
const orgPromise = fetchOrg(query)
const routePromise = fetchRoutes(query) // independent, starts immediately
const vehiclePromise = orgPromise.then(org => fetchVehicles(query, org.id))

const [org, routes, vehicles] = await Promise.all([
  orgPromise,
  routePromise,
  vehiclePromise,
])
```

## 3. Suspense boundaries per group (`async-suspense-boundaries`, HIGH)

Wrap each result group in its own Suspense boundary so fast sources render
without waiting for slow ones:

```tsx
function SearchDropdown({ query }: { query: string }) {
  return (
    <div role="listbox">
      <Suspense fallback={<GroupSkeleton label="Vehicles" />}>
        <VehicleResults query={query} />
      </Suspense>
      <Suspense fallback={<GroupSkeleton label="Routes" />}>
        <RouteResults query={query} />
      </Suspense>
      <Suspense fallback={<GroupSkeleton label="Operators" />}>
        <OperatorResults query={query} />
      </Suspense>
    </div>
  )
}
```

This gives the user immediate feedback from whichever backend responds
first, while slower groups show loading skeletons.

## 4. Keep the input responsive (`rerender-use-deferred-value`, MEDIUM)

The search input must stay snappy even when results are loading. Use
`useDeferredValue` so the query used for fetching lags behind the
displayed input:

```tsx
function FederatedSearch() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <>
      <input
        role="combobox"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <SearchDropdown query={deferredQuery} />
      </div>
    </>
  )
}
```

## 5. Request deduplication (`client-swr-dedup`, MEDIUM-HIGH)

With multiple components reading the same source, SWR/React Query
deduplicates automatically. If the user types "osl" then "oslo",
the "osl" results are already cached:

```tsx
// Multiple components can call this — only one request fires
function useVehicleSearch(query: string) {
  return useSWR(
    query.length >= 2 ? `/api/vehicles?q=${query}` : null,
    fetcher,
    { dedupingInterval: 300 }
  )
}
```

## 6. Debounce the query

Don't fire on every keystroke. Debounce 150-300ms:

```tsx
function useDebouncedValue<T>(val: T, ms = 200): T {
  const [debounced, setDebounced] = useState(val)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(val), ms)
    return () => clearTimeout(id)
  }, [val, ms])
  return debounced
}
```

Combine with `useDeferredValue` — debounce prevents network spam,
deferred value prevents render blocking:

```tsx
const [query, setQuery] = useState('')
const debounced = useDebouncedValue(query, 200)
const deferred = useDeferredValue(debounced)
// deferred is what you pass to search hooks
```
