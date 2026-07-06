# Legitimate Interest Assessment (Teste de Balanceamento) — Product Analytics

**Processing operation:** Web/product analytics for the ENS Delegation Incentives platform (incentives.ens.blockful.io) via Umami Cloud.
**Controller:** Blockful (Brazil).
**Legal basis relied on:** Legitimate interest — LGPD art. 7, IX and art. 10.
**Status:** DRAFT — internal accountability record per ANPD's *Guia Orientativo: Legítimo Interesse* (three-phase balancing test). To be validated by counsel before being treated as final.
**Date:** 2026-07-06. Review on any change to the analytics event schema (`apps/frontend/src/utils/analytics.ts` and its call sites).

---

## Phase 1 — Legitimacy and purpose (finalidade)

**Interest pursued:** Operate a reliable public-goods governance platform: understand which pages and flows work, measure delegation success/failure rates, and detect product defects (e.g. wallet-signature failures) that block ENS holders from delegating.

- The interest is legitimate, concrete, and lawful: product reliability and improvement of a free service commissioned for the ENS DAO community.
- Analytics is **not** used for advertising, data sales, marketing profiles, or cross-site tracking (stated publicly at `/privacy`).

## Phase 2 — Necessity (necessidade)

The processing is limited to the minimum needed for the purpose:

- **Tool:** Umami Cloud — cookieless; no persistent client-side identifier; visitor session identity is ephemeral (daily-rotating hash); IPs are not stored in a retrievable form by the operator.
- **Data collected:** page paths, referrer, browser/device/language, country-level location; product events (delegate click, delegation success/error, matchmaking flow steps) carrying only: the **target delegate's public address** (a public on-chain figure in the DAO context), connection state (`connected`/`disconnected`), flow step, gasless/paid mode, error stage/reason, and a scrubbed error message.
- **Deliberately excluded** (by code, not policy): the connected wallet address, tx hashes, chosen matchmaking words, names/emails/contacts. Error messages are scrubbed of any hex identifier before being sent (`errorMessageForAnalytics`).
- A less intrusive alternative (no analytics at all) would leave delegation-blocking defects invisible; the chosen configuration is the least intrusive that still serves the purpose. Aggregate pageviews alone were tried and could not diagnose flow failures.

## Phase 3 — Balancing (balanceamento) against data-subject rights

- **No user profiles are formed:** events cannot be joined to a person, wallet, or cross-site identity. Per ANPD's cookies guide, audience measurement restricted to patterns and trends on aggregated data, without combination with other tracking or profile formation, is the low-risk context where legitimate interest is adequate.
- **Legitimate expectations (art. 10):** visitors to a web dashboard reasonably expect anonymous usage measurement. Wallet-identified behavioral tracking would exceed those expectations — which is precisely why it is excluded by design.
- **Transparency measures:** public notice at `/privacy` (linked in the footer); in-flow notes in the matchmaking modals; open-source code allowing independent verification of exactly what is sent.
- **Data-subject rights channel:** contact@blockful.io (stated on `/privacy`).
- **Residual risk:** low. The only third party is Umami Cloud (processor). No sensitive personal data (LGPD art. 5, II) is processed. The delegate addresses in events belong to individuals acting in a public governance capacity and are already public on-chain data.

**Conclusion:** the controller's legitimate interest prevails; fundamental rights and freedoms of data subjects are not overridden, given the aggregated, identifier-free configuration. If the event schema ever re-introduces user-level identifiers, this assessment is void and must be redone (and consent considered).

## Records (LGPD art. 37)

This document, together with `/privacy` and the analytics implementation history in git (PR #101), constitutes the record of the assessment. Keep with Blockful's RoPA.
