# Product Principles — uhome

## Core Product Values

### Cohesion over feature count
uhome prioritizes connected, coherent workflows over a long list of disconnected features. Every feature should feel like it belongs and works seamlessly with the rest of the product.

### Calm, intuitive workflows
Workflows should feel natural and require minimal cognitive effort. Users should be able to accomplish their goals without needing to remember complex navigation paths or read documentation.

### Opinionated defaults
Rather than overwhelming users with options, uhome makes smart choices and provides sensible defaults. This reduces decision fatigue and speeds up common tasks.

### No orphaned data
All data entered should be visible and useful somewhere in the application. Information should connect and flow between related features, making the system feel coherent and valuable.

### Property-first mental model (not accounting-first)
uhome is organized around properties and the relationships between landlords, tenants, and properties. Financial tracking supports this model rather than dictating it. This is a landlord CRM, not accounting software.

## Design Philosophy

### Tools don't have to be bland or boring to be serious
Professional software can be delightful, expressive, and enjoyable to use while maintaining clarity and functionality.

### Motion is functional, not decorative
Every animation should serve a purpose: reinforcing understanding, providing feedback, or guiding attention. Motion should help users understand cause and effect, not distract from content.

### Visual feedback reinforces cause → effect
User actions should immediately produce visible, understandable results. The UI should make it clear what happened and why.

### Reduce cognitive load through hierarchy and animation
Clear visual hierarchy and thoughtful motion help users process information quickly. Well-designed interfaces feel effortless to use.

### Software should feel alive but not overwhelming
Interfaces should respond immediately to user input, provide clear feedback, and feel responsive and engaging without being distracting or chaotic.

## Anti-Patterns (What NOT to Do)

### No hidden workarounds
Users should never need to find clever ways to accomplish basic tasks. If a feature is needed, it should be accessible directly, not buried behind multiple steps or workarounds.

### No forced accounting logic
uhome does not force users to think in accounting terms (debits, credits, accounts receivable). Financial information is presented in plain language that landlords understand naturally.

### No multi-step flows for simple actions
Common, simple tasks should be achievable in one or two steps. If users frequently need to perform an action, make it quick and direct.

### No help articles required for core tasks
Core functionality should be self-evident. If users need to read documentation to perform basic tasks, the design has failed.

## Relationship to Design Philosophy Document

This document focuses on product-level principles and values. For detailed design standards, motion guidelines, and interaction patterns, see [design_philosophy.md](./design_philosophy.md).

## Relationship to Scope Guardrails

These principles guide what features to build and how to build them. For explicit boundaries on what is included or excluded from MVP, see [scope_guardrails.md](./scope_guardrails.md).

