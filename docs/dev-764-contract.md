# DEV-764 — Earnings provenance contract (backend ⇄ frontend)

Normative contract for the `provenance` block. The frontend provenance card
(feat/dev-764-provenance-card) is built against this verbatim.

---

`AddressRoundRewardSchema` (response of `GET /api/rounds/{roundNumber}?address=0x…`) gains one nullable field:

```jsonc
"provenance": {                       // null → math not available for this round
  "voter": {                          // null → wallet earned no delegate reward
    "avgVotingPower": "1234560000000000000000",   // wei string (TWAP, round month)
    "avgVotingPowerEns": "1234.56",
    "poolSharePct": "3.21",           // % of the voter pool, 2dp string (style: vpGrowthPct)
    "rawReward": "15100000000000000000",          // pre-cap allocation, wei
    "rawRewardEns": "15.10",
    "finalReward": "12400000000000000000",        // post-cap; equals voterReward
    "finalRewardEns": "12.40",
    "cap": "250000000000000000000",   // resolved cap for the round (1% of pool), wei
    "capEns": "250.00",
    "capStatus": "not_affected",      // "not_affected" | "received_redistribution" | "reached_cap"
    "redistributionReceived": "0",    // wei, "0" unless capStatus = received_redistribution
    "redistributionReceivedEns": "0.00"
  },
  "tokenHolder": {                    // null → wallet earned no holder reward; same shape:
    // avgBalance/avgBalanceEns (TWB, trailing 180 days), poolSharePct,
    // rawReward/Ens, finalReward/Ens (== tokenHolderReward), cap/capEns (5% of pool),
    // capStatus, redistributionReceived/Ens, PLUS:
    "sources": ["direct", "multidelegate", "hedgey"]  // deduped kinds; null if untracked
  }
}
```

Semantics:

- Windows: voter avg = TWAP over the round month; holder avg = TWB over trailing 180 days (`TWB_WINDOW_SECONDS`).
- Caps: voter `VOTER_CAP_BPS=100` (1%), holder `TOKEN_HOLDER_CAP_BPS=500` (5%), iterative redistribution of excess.
- Role block present iff that role's final reward > 0.
- Lottery: NO provenance block (seed/odds already served by the `lottery` payload).
- `provenance` is null for rounds whose persisted result_json predates this change (NO recompute of old rounds), and for rewardStatus `pending`/`unavailable`/`not_eligible`.
- Backend pre-formats everything: wei strings + `…Ens` via existing `formatEns()` conventions, percent strings 2dp.
- A `provenanceVersion: 1` marker in result_json metadata is recommended.

---

Implementation notes (backend, informative):

- `…Ens` fields follow the existing `formatEns()` convention — full 18-decimal
  strings (e.g. `"12.400000000000000000"`). The shortened decimals in the
  jsonc example above are illustrative.
- The marker is implemented as `metadata.provenanceVersion = 1` in
  result_json; rounds without it expose `provenance: null`.
- `sources` is persisted with the round data, so for `provenanceVersion >= 1`
  it is always a non-empty array on earned holder rewards; `null` is reserved
  for untracked data.
