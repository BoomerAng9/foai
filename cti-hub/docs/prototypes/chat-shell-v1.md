# SCREEN: Chat Shell

GOAL: Define the first chat shell scaffold with required controls before major UI implementation.
REVISION: 1
ASSUMPTIONS:
- Existing theme/CSS direction is preserved; this is structure-only.
- Voice/vision backends are represented as selectors/adapters for now.
- Data sources can be multi-selected and returned from builder flow.

+----------------------------------------------------------------------------------+
| Chat w/ACHEEVY                                                    [Model v]     |
|----------------------------------------------------------------------------------|
| [ + Attach ]   [ Voice v ]   [ Data Sources v ]   [ Build Source ]   [Send]     |
|----------------------------------------------------------------------------------|
| Selected Sources: [Source A x] [Source B x] [Source C x]                         |
|----------------------------------------------------------------------------------|
| User                                                                       Agent |
|                                                                                  |
|  --------------------------------------------------------------                  |
| | Prompt input area / voice transcript / attached context zone |                 |
|  --------------------------------------------------------------                  |
|                                                                                  |
|  [Response stream area]                                                          |
|                                                                                  |
|----------------------------------------------------------------------------------|
| Status: listening | processing | tool use | memory update | ready               |
+----------------------------------------------------------------------------------+

USER EDIT NOTES:
- Keep bezel text exact: Chat w/ACHEEVY.
- Ensure Build Source returns user to chat with attached sources.
