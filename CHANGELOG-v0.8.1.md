# AULA F75 Max Studio v0.8.1

## Light Chase correction
- Replaced LED-index/list-order chase logic with a cached physical-layout serpentine path.
- Groups staggered keys into rows by physical Y coordinate and alternates direction per row.
- Added a bright moving head with a smooth trailing fade and correct wrap-around.
- Kept Theatre Chase separate, using the same physical path for consistent sequencing.
- Added regression coverage for motion over time and all 82 LED slots.

All other v0.8.0 features, palettes, effect tuning, HID protocol and reactive input are preserved.