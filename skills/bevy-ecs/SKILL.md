---
name: bevy-ecs
description: Provides specialized architectural guidance and implementation patterns for building games and applications with the Bevy Entity Component System (ECS) engine.
---

# Bevy Game Development Skill

A specialized skill for developing games and applications using the Bevy game engine,
based on real-world experience building complex Bevy projects.

> **Activation:** Use when implementing Bevy features, designing component architectures,
> creating/debugging systems, working with UI, building/testing, troubleshooting issues,
> or organizing project structure.

## Before You Start: Essential Bevy Tips

### Bevy 0.18 Breaking Changes

**If working with Bevy 0.18**, be aware of significant API changes from 0.17:

- **HDR**: Use the `Hdr` component, not `Camera { hdr: true }`
- **Bloom**: Import from `bevy::post_process::bloom`, not `bevy::core_pipeline::bloom`
- **Events**: Use `MessageReader<T>` / `MessageWriter<T>`, not `EventReader<T>` / `EventWriter<T>`
- **Collections**: Use `bevy::platform::collections::{HashMap, HashSet}`, not `std` or `bevy::utils`
- **Text rendering**: Requires the `default_font` feature when using `default-features = false`
- **Query single**: `query.single()` returns `Result`, use `let Ok(x) = query.single()` pattern

### Bevy 0.17 Breaking Changes

- Material handles now wrapped in `MeshMaterial3d<T>` (not `Handle<T>`)
- Event system replaced with observer pattern (`commands.trigger()`, `add_observer()`)
- Color arithmetic operations removed (use component extraction)

### Consult Bevy Registry Examples First

**The registry examples are your bible.** Always check them before implementing new features.

**Location:** `~/.cargo/registry/src/index.crates.io-*/bevy-0.18.*/examples`

### Use Plugin Structure

Break your app into discrete modules using plugins:

```rust
pub struct CombatPlugin;

impl Plugin for CombatPlugin {
    fn build(&self, app: &mut App) {
        app
            .add_event::<DamageEvent>()
            .add_systems(Update, (process_damage, check_death));
    }
}
```

### Design Before Coding

**Pure ECS demands careful data modeling.** Before implementing:

- Design the data model (entities, components, events, systems)
- Check Bevy examples for similar patterns
- Review docs and existing code
- Create a plugin for the feature domain

## Core Development Principles

### Think in ECS Terms

Always think in terms of **data** (components) and **transformations** (systems), not objects and methods.

- **Components** = Pure data, no logic
- **Systems** = Pure logic, operate on components
- **Events** = Communication between systems
- **Resources** = Global state (use sparingly)

### Component-Driven Design

**Keep components focused:**

```rust
// GOOD: Small, focused components
#[derive(Component)]
pub struct Health { pub current: f32, pub max: f32 }

#[derive(Component)]
pub struct Armor { pub defense: f32 }

// BAD: Monolithic component
#[derive(Component)]
pub struct CombatStats {
    pub health: f32,
    pub armor: f32,
    pub strength: f32,
    // ... wastes memory for entities that only have some stats
}
```

**Add helper methods via impl blocks:**

```rust
impl Health {
    pub fn is_alive(&self) -> bool {
        self.current > 0.0
    }

    pub fn percentage(&self) -> f32 {
        self.current / self.max
    }
}
```

### System Design and Ordering

**Order systems by dependencies:**

```rust
.add_systems(
    Update,
    (
        // 1. Input processing
        handle_input,
        // 2. State changes
        process_events,
        update_state,
        // 3. Derive properties from state
        calculate_derived_values,
        // 4. Visual updates
        update_materials,
        update_animations,
        // 5. UI updates (must run last)
        update_ui_displays,
    ),
)
```

**Use change detection to optimize:**

```rust
// Only process entities where Health changed
pub fn update_health_bar(
    query: Query<(&Health, &mut HealthBar), Changed<Health>>,
) {
    for (health, mut bar) in query.iter_mut() {
        bar.width = health.percentage() * 100.0;
    }
}
```

### Idiomatic Option/Result Transforms in Systems

Bevy systems constantly return `Option` and `Result` from queries, resource lookups,
and entity access. Prefer combinators and `?` over nested `match`/`if let` trees.
([Effective Rust — Item 5](https://www.lurklurk.org/effective-rust/transform.html))

**Use `?` propagation for guard-heavy helpers:**

```rust
// Return Option<()> and use ? for early exits
fn process_hex(grid: &HexGrid, hex: Hex, entities: &HexEntities) -> Option<()> {
    let &entity = entities.get(&hex)?;        // replaces if-let + return
    let disc = grid.get(entity).ok()?;        // Result → Option via .ok()
    disc.is_active().then_some(())?;           // bool guard
    // ... side effects only if all guards pass
    Some(())
}
```

**Flatten nested `if let` with `.and_then()`:**

```rust
// BAD: pyramid of doom
if let Some(res) = opt_res.as_ref() {
    if let Some(&entity) = res.map.get(&hex) {
        if let Ok(name) = query.get(entity) {
            println!("{name}");
        }
    }
}

// GOOD: chained combinators
if let Some(name) = opt_res.as_ref()
    .and_then(|r| r.map.get(&hex))
    .and_then(|&e| query.get(e).ok())
{
    println!("{name}");
}
```

**Common transforms in Bevy code:**

| Have | Want | Use |
|------|------|-----|
| `Option<T>` | `Result<T, E>` | `.ok_or(err)` / `.ok_or_else(\|\| err)` |
| `Result<T, E>` | `Option<T>` | `.ok()` |
| `&Option<T>` | `Option<&T>` | `.as_ref()` |
| `Option<T>` | `T` (or default) | `.unwrap_or(default)` / `.unwrap_or_default()` |
| `Option<T>` | `Option<U>` | `.map(\|t\| ...)` / `.and_then(\|t\| ...)` |
| `bool` guard | `Option<()>` | `.then_some(())` for use with `?` |

**Performance:** These combinators are `#[inline]` generics — they compile to identical
machine code as hand-written `match` expressions, with zero runtime cost.

## Build and Testing Workflow

### Build Commands

**Development (faster iteration):**

```sh
cargo build --features bevy/dynamic_linking
```

- Uses dynamic linking for faster compile times (2-3x faster)
- **CRITICAL:** Always use this for development builds

**Quick Check:**

```sh
cargo check
```

- Fastest way to verify compilation — use after every significant change

**Release (production):**

```sh
cargo build --release
```

### Build Management - CRITICAL

**DO NOT delete target binaries freely!** Bevy takes minutes to rebuild from scratch.

- Avoid `cargo clean` unless absolutely necessary
- Stick to one Bevy version per project

### Testing Workflow

- **After component changes:** Run `cargo check`
- **After system changes:** Run `cargo check` then `cargo build --features bevy/dynamic_linking`
- **Manual testing:** Does the game launch? Do new features work? Are console logs correct? Do visuals appear correctly?

**Validation points** — let the user test at these milestones:

- New entity spawned
- New mechanic implemented
- Visual effects added
- Major system changes

## UI Development in Bevy

Bevy uses a flexbox-like layout system. Follow the marker component pattern:

**1. Create marker components:**

```rust
#[derive(Component)]
pub struct HealthBar;

#[derive(Component)]
pub struct ScoreDisplay;
```

**2. Setup in Startup:**

```rust
pub fn setup_ui(mut commands: Commands) {
    commands.spawn((
        HealthBar,
        Node {
            position_type: PositionType::Absolute,
            left: Val::Px(10.0),
            top: Val::Px(10.0),
            width: Val::Px(200.0),
            height: Val::Px(20.0),
            ..default()
        },
        BackgroundColor(Color::srgba(0.8, 0.2, 0.2, 0.9)),
    ));
}
```

**3. Update in Update:**

```rust
pub fn update_health_ui(
    health: Query<&Health, With<Player>>,
    mut ui: Query<&mut Node, With<HealthBar>>,
) {
    if let (Ok(health), Ok(mut node)) = (health.get_single(), ui.get_single_mut()) {
        node.width = Val::Px(health.percentage() * 200.0);
    }
}
```

## Incremental Development Strategy

### Phase-Based Development

- **Phase 1: Foundation** — Core components and basic systems
- **Phase 2: Content** — Add entities and populate world
- **Phase 3: Polish** — UI improvements and visual effects
- **Phase 4: Advanced Features** — Complex mechanics and AI

### Iteration Pattern

```
1. Plan → 2. Implement → 3. Build → 4. Test → 5. Refine
↑                                           ↓
←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

Each phase should have clear success criteria, manual test cases, and user validation points.

## Performance Optimization

### When to Optimize

**For prototypes (7-100 entities):** No optimization needed. Change detection is sufficient.

**For production (100+ entities):**

- Use spatial partitioning for proximity queries
- Batch material updates
- Consider Fixed timestep for physics
- Profile before optimizing

### Query Optimization Tips

- **Use change detection:** `Query<&Component, Changed<Component>>`
- **Filter early:** `Query<&A, (With<B>, Without<C>)>` instead of filtering in loops
- **Check resource changes:** Return early if resource hasn't changed

## Common Pitfalls to Avoid

- Forgetting to register systems in `main.rs`
- Borrowing conflicts (use `get_many_mut` for multiple mutations)
- Not using `Changed<T>` for expensive operations
- Wrong system ordering (input -> state -> derived -> visual -> UI)
- Entity queries after despawn (use `if let Ok()` pattern)
- Material/asset handle confusion (store handles properly)

## Using Subagents for Complex Features

When implementing multi-step features, use the plan-implementer subagent with this structure:

```
Goal: [One sentence describing end state]
Current State: [What exists now]
Requirements: [Numbered list of what to build]
Implementation Steps: [Suggested approach]
Success Criteria: [How to verify it works]
Notes: [Important context, edge cases, design principles]
```

## Additional Resources

- [Official Bevy Book](https://bevyengine.org/learn/book/)
- [Bevy Examples](https://github.com/bevyengine/bevy/tree/main/examples) (also in `~/.cargo/registry/...`)
- [Bevy Cheat Book](https://bevy-cheatbook.github.io/)
- [System Sets](https://bevy-cheatbook.github.io/programming/system-sets.html)
- [Effective Rust — Option/Result Transforms](https://www.lurklurk.org/effective-rust/transform.html)

**ECS Design Principles:**

- Prefer composition over inheritance
- One component = one concern
- Systems should be pure functions
- Use events to decouple systems
- **Design data model before coding**
- **Check registry examples first**
