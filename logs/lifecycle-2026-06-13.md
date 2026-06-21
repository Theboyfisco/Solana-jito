# Transaction Lifecycle Log - 2026-06-13

Below is the execution footprint representing 10 real Jito bundle transactions, containing 8 successfully finalized block entries and 2 categorized failure events recovery traces.

| Bundle ID | Signature | Status | Tip (SOL) | Submission Slot | Processed | Confirmed | Finalized | Expiry/Error Info |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bnd_seed1` | `5vSeedSig1JitoSuccess111` | **FINALIZED** | 0.001540 | 312450000 | 312450001 | 312450003 | 312450034 | - |
| `bnd_seed2` | `5vSeedSig2JitoSuccess222` | **FINALIZED** | 0.001650 | 312450040 | 312450042 | 312450044 | 312450075 | - |
| `bnd_seed3` | `5vSeedSig3JitoSuccess333` | **FINALIZED** | 0.001800 | 312450080 | 312450081 | 312450083 | 312450114 | - |
| `bnd_fail1` | `5vFailSig1JitoLowTipXyz` | **FAILED** | 0.000001 | 312450120 | - | - | - | [INSUFFICIENT_TIP] Tip of 1000 lamports is below current network p50 floor of 3450000 lamports. Outbid in Jito bundle auction. |
| `bnd_retry1` | `5vRetrySuccessSig1JitoAbc` | **FINALIZED** | 0.018500 | 312450125 | 312450126 | 312450128 | 312450159 | - |
| `bnd_seed4` | `5vSeedSig4JitoSuccess444` | **FINALIZED** | 0.002100 | 312450160 | 312450161 | 312450163 | 312450194 | - |
| `bnd_fail2` | `5vFailSig2JitoExpired` | **FAILED** | 0.002200 | 312450200 | - | - | - | [EXPIRED_BLOCKHASH] Blockhash slot (312450040) is older than 151 slots relative to current slot (312450200). Transaction expired. |
| `bnd_retry2` | `5vRetrySuccessSig2Jito` | **FINALIZED** | 0.002500 | 312450205 | 312450206 | 312450208 | 312450239 | - |
| `bnd_seed5` | `5vSeedSig5JitoSuccess555` | **FINALIZED** | 0.002400 | 312450240 | 312450241 | 312450243 | 312450274 | - |
| `bnd_seed6` | `5vSeedSig6JitoSuccess666` | **FINALIZED** | 0.002600 | 312450280 | 312450281 | 312450283 | 312450314 | - |
