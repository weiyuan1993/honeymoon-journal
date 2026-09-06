---
name: trip-option-evaluator
description: "Make an itinerary-aware recommendation between travel tickets, passes, transport, tours, or lodging options. Use when the user asks 是否值得、要買哪個、能否當天買, or wants a schedule-aware comparison; it does not update the sheet by itself."
metadata:
  short-description: trip-option-evaluator
---

# Trip Option Evaluator

Give a direct recommendation for the real trip, not a generic attraction catalogue or lowest-price-only comparison.

## Ground the decision

Read the relevant live `行程`, existing `票券`, and unfinished `待辦` first. Identify fixed entry times, booked trains or hotels, transfer duration, desired sunset or meal windows, and the user's stated priority before researching options.

Verify current rules, prices, release dates, operating season, and availability from official sources. Use a third-party checkout or listing only when it is itself being compared. If the slot or inventory cannot be checked, say so; do not turn an unverified suggested time into an available booking.

## Evaluate the options

For each realistic option, assess only the factors that affect this itinerary:

- total out-of-pocket cost for the travelling party, inclusions, exclusions, and refund constraints;
- reservation window, timed-entry or queue risk, and whether day-of purchase means a guarantee or merely a possibility;
- transport route, operating season, arrival buffer, and impact on other fixed plans;
- experience value relative to the user's priorities, energy, and existing alternatives.

Prefer a small set of viable options. For passes, calculate the actual itinerary total and include convenience or one-payment value when it matters; do not invent extra stops solely to make a pass look worthwhile.

## Recommendation and boundary

Lead with one clear conclusion: **現在買**, **等開賣／再確認**, **可當天決定**, or **不建議**. State the decisive trade-off and a practical fallback.

Do not edit the workbook as a consequence of analysis. After the user confirms a purchase or an adopted itinerary change and asks for an update, use `trip-booking-update` or `itinerary-layering` as appropriate.
