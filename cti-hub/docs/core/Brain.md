# Brain

The Brain refers to the state management and memory retention layer of GRAMMAR.
- **Session Memory**: In-memory contextual data related to the current chat session.
- **Change Orders**: Immutable instructions recorded in memory when a user request alters the execution state.
- **Persistent Prototypes**: Revisions to prototypes saved locally in the `artifacts/prototypes` or database state.
- **Tenant Context**: Per-tenant context referencing rate-limits, budgets, and environment tokens.
