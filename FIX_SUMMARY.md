# Package Assignment Fix Summary

## Issue
When an admin assigns a package to an agent, the credits/package were not being added to the agent's balance, even after sync.

## Root Causes

### 1. Missing Sync Queue Entry (`server/db.ts`)
The `assignPackageToAgent` function was updating SQLite but **not adding the transaction to the `sync_queue`** for tracking/sync processing. This meant package credit transactions could be lost or not properly tracked during sync cycles.

### 2. Undefined Balance in MongoDB (`server/mongo.ts`)
The `mongoAssignPackage` function calculated `newBalance = currentAgent.balance + assignment.credits`. If the agent's balance was `undefined` (which can happen if the agent was created without a balance or the MongoDB document was missing the field), this would result in `NaN` - effectively losing the credit addition.

## Changes Made

### 1. `server/db.ts` - `assignPackageToAgent` function (added lines 629-641)
```typescript
// Queue to sync
database.run(
  'INSERT INTO sync_queue (syncId, recordType, recordId, payload, status, retryCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [
    uuidv4(),
    'TRANSACTION',
    txId,
    JSON.stringify({ transactionId: txId, agentId, deviceId: agent.deviceId, type: 'PACKAGE_CREDIT', amount: assignment.credits, balanceAfter: newBalance, packageName: assignment.packageName, note: transaction.note, createdAt: now }),
    'PENDING',
    0,
    now,
  ]
);
```

### 2. `server/mongo.ts` - `mongoAssignPackage` function (line 274)
```typescript
// Before:
const newBalance = currentAgent.balance + assignment.credits;

// After:
const newBalance = (currentAgent.balance || 0) + assignment.credits;
```

## How This Fixes the Issue

1. **Sync Queue Tracking**: Package credit transactions are now properly queued in the `sync_queue` table, ensuring they can be tracked and retried if sync fails or the device was offline.

2. **Safe Balance Calculation**: The MongoDB balance calculation now defaults to 0 if the balance field is undefined, preventing `NaN` results and ensuring credits are always properly added.

3. **Idempotent Sync**: The existing `performIdempotentSync` function can now properly identify and mark package credit transactions as synced when the sync cycle runs.

## Data Flow After Fix

```
Admin Assigns Package
       ↓
API: /api/agents/:agentId/package
       ├──→ assignPackageToAgent(db.ts) → Updates SQLite + Creates transaction (syncStatus: PENDING)
       │         └──⊳ NEW: Also inserts into sync_queue for tracking
       ├──→ mongoAssignPackage(mongo.ts) → Updates MongoDB balance
       │         └──⊳ FIX: Uses (balance || 0) to handle undefined cases
       ↓
Sync Cycle (optional): marks transactions as SYNCED
       ↓
Agent balance properly reflected in both SQLite and MongoDB
```