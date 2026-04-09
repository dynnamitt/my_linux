---
name: federated-search
description: >
  Guide for implementing federated search UX in React — a single search input
  that fires multiple async requests to different data sources and displays
  grouped, streaming results in a dropdown. Use this skill when building search
  across multiple backends or entity types, command palettes with categories,
  omnibar/typeahead with grouped suggestions, or multi-source autocomplete.
  Also use when the user wants to avoid a full-text search engine (OpenSearch,
  Elasticsearch) by leveraging existing SQL indexes with parallel async queries.
metadata:
  author: kdm
  version: "1.0.0"
---

# Federated Search

A single search input dispatches queries to **N data sources in parallel**,
displaying grouped results as they stream in. Each source can be a different
entity type, API endpoint, or GraphQL query. The user sees a unified dropdown
with categorized suggestions — no need for a heavyweight search engine.

AWS Console calls this "Unified Search". GitHub implements it via their
[QueryBuilder component](https://github.blog/2022-12-13-creating-an-accessible-search-experience-with-the-querybuilder-component).
The pattern is sometimes called "multi-index search" (Algolia) or is a subset
of the "command palette" when combined with action dispatch.

## When to choose this over full-text search

Federated search shines when **advanced-search prefixes map to existing
backend indexes** (SQL, GraphQL resolvers). Each individual query is fast
because it hits a purpose-built index, making many parallel requests a smooth
experience despite the fan-out. This avoids:

- An OpenSearch/Elasticsearch cluster and its operational overhead
- An index-sync codebase keeping the search index in sync with the DB
- A single monolithic search endpoint that tries to do everything

The tradeoff: you lose fuzzy full-text ranking across entity types. If your
users need "search everything with one relevance score", you need a search
engine. If they need "find vehicles by plate, routes by name, operators by
code" — federated search is simpler and faster.

## The pattern

```
[ search input: "oslo" ]
  ├─ async → GET /vehicles?q=oslo     → Vehicle group (lazy)
  ├─ async → GET /routes?q=oslo       → Route group (lazy)
  ├─ async → GET /operators?q=oslo    → Operator group (lazy)
  └─ (each result row offers two actions)
       a) append filter prefix to query: "vehicle:oslo"
       b) navigate directly to the result
```

Each group loads independently. Fast sources appear first; slow ones show
a skeleton. The dropdown builds lazily as responses arrive.

## Implementation checklist

When building this in React, read the reference files for detailed code:

### Quick mock backend → `references/graphql-mock.md`

- [ ] Spin up a static-JSON GraphQL server (`@apollo/server`) with one query per entity type
- [ ] Add artificial delays per resolver to test lazy-loading UX
- [ ] Wire up Apollo Client hooks — one `useQuery` per group

### Browser-side GraphQL via Rust/WASM → `references/graphql-wasm.md`

- [ ] For zero-server prototyping: Exograph playground (full GraphQL + Postgres in WASM)
- [ ] For custom Rust logic: Juniper compiled to `wasm32` + `wasm-bindgen`
- [ ] For edge deploy: Exograph on Cloudflare Workers (same WASM binary)

### Async & performance → `references/react-perf.md`

- [ ] Fire all source queries in parallel (`Promise.all` / multiple React Query hooks)
- [ ] Use `useDeferredValue` on the query string so the input stays responsive
- [ ] Wrap each result group in `<Suspense>` so fast groups render before slow ones
- [ ] Use SWR/React Query for automatic request dedup and caching
- [ ] Debounce the query (150-300ms) to avoid flooding on every keystroke

### Component design & a11y → `references/a11y.md`

- [ ] Compound component API: `<Search.Root>` / `<Search.Group>` / `<Search.Item>`
- [ ] `role="combobox"` on the input, `role="listbox"` on the dropdown
- [ ] `role="group"` + `aria-label` for each category section
- [ ] `aria-live="polite"` region announcing result counts as they stream in
- [ ] Arrow key navigation across groups (wrapping at boundaries)
- [ ] Escape closes, Enter activates focused item
- [ ] Two action types per item: autocomplete (append to query) vs jump-to (navigate)

### Prefix-based query parsing

If your search supports filter prefixes (e.g. `vehicle:`, `route:`):

- Parse prefixes from the query string before dispatching
- Auto-suggest available prefixes as the user types (match against backend-supported indexes)
- When a prefix is active, only fire that specific source query
- Show prefix chips in the input for active filters

## Libraries

| Library | Multi-source? | Best for |
|---------|:---:|---|
| [@algolia/autocomplete-js](https://github.com/algolia/autocomplete) | Yes | Full-featured, `getSources()` accepts N async functions |
| [cmdk](https://github.com/pacocoursey/cmdk) | Groups; DIY async | Command palette UX. Used by shadcn/ui `<Command>` |
| [Turnstone](https://github.com/tomsouthall/turnstone) | Yes | Purpose-built for multi-endpoint grouped typeahead |
| [Downshift](https://www.downshift-js.com/) | DIY | Accessible combobox primitives. Pair with `Promise.allSettled()` |

If your project already uses **Downshift** (common in Entur apps via `@entur/dropdown`),
extend it with parallel async sources rather than adding a new library.

## Prior art

- [GitHub QueryBuilder (2022)](https://github.blog/2022-12-13-creating-an-accessible-search-experience-with-the-querybuilder-component) — grouped suggestions, two action types (autocomplete vs jump-to), prefix-based dynamic suggestions
- [GitHub Code Search (2021)](https://github.blog/2021-12-08-improving-github-code-search) — auto-completion for `org:`, `repo:`, `language:` qualifiers
- [GitHub Jump-to (2018)](https://github.blog/changelog/2018-05-24-jump-to/) — dropdown with multiple entity types, recency-ranked
- [What is Federated Search — Algolia](https://www.algolia.com/blog/ux/what-is-federated-search) — canonical explainer
- [What is Federated Search — Meilisearch](https://www.meilisearch.com/blog/what-is-federated-search) — 4 types of federated search
- [Command K Bars — Maggie Appleton](https://maggieappleton.com/command-bar) — design essay from Spotlight to modern palettes
