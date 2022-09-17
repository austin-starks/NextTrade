# Notes:

## What are conditions?

Strategies use conditions in order to perform an automated trade. If any one of a strategy's conditions are met, a trade is executed using the buying/selling configurations in the strategy object. Conditions can be simple (NET stock must be above $120/share) or complex (NET stock must be 1 SD below the 10 day moving average and I must hold less than 10% of my portfolio in NET stock).

## How to create a new condition?

Create a class that inherits from AbstractCondition, and implement it's abstract methods. isTrue returns true when that condition is "satisfied".
