# Agent instructions for this fork

Read [CLAUDE.md](CLAUDE.md) and [README.md](README.md). Follow upstream frontend conventions and the backend's CONTRIBUTING.md. The shared implementation plan is in the companion backend checkout at `../crossmart/IMPLEMENTATION.md`.

- Preserve Crossmart's original visual identity, layout, navigation, native agent console and component patterns. Do not redesign working screens.
- Extend existing features only when a current phase needs a UI surface; use existing shadcn/ui primitives, feature structure, generated API types and TanStack Query. Do not hand-edit generated API schema.
- Scope: Odoo 18 source integration, WooCommerce native channel, and completion of existing Mercado Libre Ecuador support. No dropshipping, separate media manager or replacement agent console.
- Follow the current mission in the backend plan. Phase 1: one-screen Odoo source connection, source indicators and selective field protection; keep manual products and commercial fields editable. No global product editor lock, no wizard. Use Spanish (Ecuador) for new integration UI and related feedback; plan incremental localization of existing screens separately. No customer-facing inbox or sales agent in this phase.
- Use a dedicated branch per phase and isolated local API/frontend configuration. Do not connect to or change any unrelated application, production environment or shared database. No real channel writes without explicit authorization.
- Follow upstream format, lint, typecheck, test and build instructions. Add focused tests only for changed behavior. Report real browser behavior and errors; a green test or compiled screen is not proof of operational success.
- Do not commit credentials, actual store URLs, private source, customer data, product data or local deployment settings. Respect upstream license and English-language documentation/commit conventions.

Keep scope and status in the companion backend IMPLEMENTATION.md; do not duplicate it.
