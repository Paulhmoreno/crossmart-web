# Agent instructions for this fork

Read [CLAUDE.md](CLAUDE.md) and [README.md](README.md). Follow upstream frontend conventions and the backend's CONTRIBUTING.md. The shared implementation plan is in the companion backend checkout at `../crossmart/IMPLEMENTATION.md`.

## Permanent UI rules

- The original Crossmart UI is the design authority. Compare against upstream `crossmart-io/crossmart-web`, using the corresponding screen or closest native feature. Reuse its existing layout, navigation, typography, spacing, components, buttons, badges, dialogs, interactions, dark/light tokens and accessibility. Do not redesign, add a parallel design system, or introduce channel-specific UI variants without a functional requirement. Compare equivalent states, not connected versus disconnected.
- English is the canonical interface language. All user-facing UI copy must use the shared localization mechanism with English fallback and Spanish (Ecuador) translations. Keep stable machine identifiers, code, technical documentation and commits in English. New screens, errors, validation messages and status labels must follow the same localization conventions. Language selection is global for the UI, persisted, and does not translate product content, merchant data or identifiers. Do not hard-code Spanish or create per-channel language overrides.
- Keep the interface quiet and concise. Do not add permanent explanatory banners, repeated field-level lock notes, redundant badges, instructional paragraphs, security implementation details or helper text that merely repeats a label. Prefer the existing control's affordance. Odoo source ownership needs only a discreet source identifier and disabled protected controls; do not replace deleted messages with a proliferation of tooltips or icons. Keep actionable errors, genuinely necessary instructions, destructive-action confirmations, accessibility labels, actual operational status and meaningful feedback. Do not indiscriminately delete native upstream copy.
- Preserve all validated functionality, security, permissions, source ownership, existing data, provider/model discovery and connection testing. UI cleanup is not a reason to remove functionality or rebuild forms.

## Engineering and scope

- Extend existing features only when the current phase needs a UI surface; use existing shadcn/ui primitives, feature structure, generated API types and TanStack Query. Do not hand-edit generated API schema.
- Scope: Odoo 18 source integration, WooCommerce native channel, native commercial AI, and completion of existing Mercado Libre Ecuador support. Follow the current mission; no dropshipping, separate media manager, replacement agent console or customer inbox.
- Use a dedicated branch per phase and isolated local API/frontend configuration. No unrelated application, production environment or shared database changes. No real channel writes without explicit authorization.
- Follow upstream format, lint, typecheck, test and build instructions. Add focused tests only for changed behavior. Verify real browser behavior, both locales, and light/dark mode for changed UI. Report actual errors and limitations rather than relying on build success.
- Do not commit credentials, actual store URLs, private source, customer data, product data or local deployment settings. Respect upstream license and English-language documentation/commit conventions.

Keep scope and status in the companion backend IMPLEMENTATION.md; do not duplicate it or create a separate design handbook.
