# LUC Integration Guide
**Locale Usage Calculator**

## How It Works
1.  **Ingest**: ACHEEVY sends user prompt to UEF.
2.  **Estimate**: UEF calls `LUCEngine.estimate(prompt)`.
3.  **Discount**: LUC checks `ByteRover` for existing similar patterns.
    - *Found?* Apply `15-40%` discount (reuse code vs gen new).
    - *New?* Full price.
4.  **Quote**: Returns `UCPQuote` to frontend.
5.  **Lock**: User accepts quote -> Budget Locked.

## Usage in Code
```typescript
import { LUCEngine } from './luc';

const quote = LUCEngine.estimate("Build a blog");
console.log(quote.variants[0].estimate.totalUsd);
```
