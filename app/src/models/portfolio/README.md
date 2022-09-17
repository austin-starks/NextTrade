# Notes:

## Design Pattern: Bridge

Notice this structure implements the Bridge design pattern. The Bridge pattern is used to separate an abstraction from the implementation. We needed this pattern to implement Backtesting functionality. A naive way of implementing backtesting would have been to copy-paste the logic relating to position management. But this violates the SOLID principle of "open-closed". By seperating the abstraction from the implementation, we can use different portfolio implementations for forward-testing and back-testing, and facilitate code re-use and maintainability.
