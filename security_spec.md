# Security Specification: Savanna Pro

## Data Invariants
1. A user profile cannot be created by anyone except the user themselves, and roles can only be promoted by an 'owner'.
2. Cattle records must have a valid `tagId` and `status`.
3. Production logs must include a `recordedBy` UID and valid `volume`.
4. Financial transactions are strictly forbidden for 'employee' roles.
5. Inventory management is restricted to 'owner' and 'employee' ranks.

## The Dirty Dozen Payloads (Target: Permission Denied)

| ID | Collection | Operation | Payload / Context | Reason for Rejection |
|---|---|---|---|---|
| 01 | users | update | `{ role: "owner" }` as Employee | Privilege Escalation |
| 02 | cattle | create | `{ tagId: "X", status: "milking", ownerId: "OTHER_UID" }` | Identity Spoofing |
| 03 | transactions | get | `get(/transactions/some_id)` as Employee | PII/Financial Leak |
| 04 | transactions | list | `where("ownerId", "==", "my_uid")` as Employee | Data Isolation Violation |
| 05 | inventory | create | `{ name: "Feed", category: "Invalid" }` | Schema Validation Fail |
| 06 | production | update | `{ volume: -50 }` | Value Poisoning (Logical) |
| 07 | cattle | delete | `delete()` as Employee | Sub-Owner Authority Violation |
| 08 | users | create | `{ role: "owner" }` as New User | Self-Assigned Role |
| 09 | production | create | Missing `recordedBy` | Constraint Violation |
| 10 | inventory | update | `{ quantity: 1000000000 }` | Resource Exhaustion (Logical) |
| 11 | cattle | update | `{ ownerId: "NEW_OWNER" }` | Ownership Poisoning |
| 12 | cattle | create | `{ tagId: "VeryLongId" + ("A" * 2000) }` | ID Poisoning / Denial of Wallet |
