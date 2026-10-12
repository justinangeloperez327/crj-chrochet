# Production planning

Use `/admin/production` to manage paid orders that require workshop work. Product lines distinguish reserved finished stock from quantities needing production. Custom bouquets use their finalized material plan.

The workflow is Confirmed → In Production → Quality Check → Ready. Delivery then follows the order fulfillment workflow. Check material availability before starting production; material consumption happens transactionally when production starts.

Set priority, assignee, planned minutes, planned start and due date. The board summarizes workload, shortages, overdue jobs and completed work. Lead-time defaults help calculate due dates; confirm dates with the workshop rather than treating them as guaranteed delivery promises.

Consumed materials are not restored by cancelling work. Review losses and physical returns separately. See [materials](materials-and-bouquets.md) and [refunds](refunds-and-fulfillment.md).
