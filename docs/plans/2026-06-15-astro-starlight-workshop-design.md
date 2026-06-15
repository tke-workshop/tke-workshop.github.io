# Astro Starlight Workshop Redesign

## Goal

Replace the MkDocs Material-led experience with an Astro + Starlight workshop site that feels like one coherent learning product across documentation and executable cookbooks.

## Current Problem

The repository currently mixes three experiences:

- MkDocs Material documentation pages for most workshop content.
- A custom standalone HTML homepage.
- A custom dark Cookbook Collection page with separate data loading and styling.

This makes the workshop feel fragmented. Documentation is structured like a knowledge base, while cookbooks feel like a separate application. The new site should make cookbooks part of the same learning journey.

## Chosen Direction

Use Astro + Starlight as the new primary site framework.

Astro keeps the output static and fast. Starlight provides documentation primitives such as sidebar navigation, search, content collections, cards, badges, tabs, and steps. Custom Astro pages will handle product-like entry points such as the homepage and cookbook index.

## Information Architecture

The new first version organizes the site around user intent:

- Start: overview, learning paths, environment setup.
- Operate: cluster, node, workload, and service operations.
- Practice: security, availability, scalability, cost, upgrade, observability.
- AI on TKE: training, inference, OpenClaw, OPEA, KitOps, AI Copilot.
- Cookbooks: executable recipes with scripts, estimated time, verification, and prompts.

## Cookbook Experience

Cookbooks become a first-class route:

- `/cookbooks/` lists executable recipes with filters, tags, and status.
- `/cookbooks/<id>/` presents one recipe with purpose, prerequisites, commands, related files, verification steps, and an Agent prompt.
- Cookbook data moves from a global browser script into typed source data.

The first version will migrate the three official local cookbooks and keep room for community GitHub-sourced cookbooks later.

## Migration Strategy

This is a framework migration, not a full content rewrite.

Phase 1:

- Add Astro/Starlight project files.
- Build a new homepage and cookbook experience.
- Add curated landing pages for the main workshop sections.
- Switch GitHub Actions from MkDocs to Astro build.
- Keep the existing `docs/` and `cookbook/` content in the repository as source assets.

Phase 2:

- Convert old MkDocs pages into Starlight-compatible Markdown/MDX.
- Fix legacy relative links.
- Replace MkDocs-only admonitions and tab syntax with Starlight components.

## Risks

- Existing MkDocs Markdown contains syntax that Astro does not understand directly.
- GitHub Pages needs the static output directory changed from `site` to `dist`.
- Search quality depends on how much content is migrated into Starlight collections.

## Verification

The Phase 1 implementation must pass:

- `npm install`
- `npm run build`
- a local preview/dev server smoke test if dependencies install successfully
