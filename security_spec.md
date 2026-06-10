# Firestore Security Specification

This document defines the Security Specifications for the **Smart Meeting Room Booking System**.

## 1. Data Invariants

1. **Identity Integrity**: Booking requests under a certain email must only be created by the user authenticated with that email. 
2. **Permission Isolation**: Only administrators can approve, cancel, or delete bookings. Users can only create bookings or cancel their own (which means transitioning status from approved/pending to cancelled, or admins can cancel). Wait! The rules defined in the prompt say:
   - READ bookings: Signed-in users can read.
   - CREATE bookings: Signed-in users can create.
   - UPDATE bookings: Only Admins can update.
   - DELETE bookings: Only Admins can delete.
   - This keeps things simpler and aligned with the prompt rules:
     ```js
     match /bookings/{bookingId} {
       allow read: if request.auth != null;
       allow create: if request.auth != null;
       allow update: if isAdmin();
       allow delete: if isAdmin();
     }
     ```
3. **Staff Records**: Anyone authenticated can read staff documents (for autofill), but only admins can write (create/update/delete) staff records.
4. **Rooms**: Anyone authenticated can read rooms, only admins can write rooms.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious or invalid Firestore updates/creates and their target outcomes:

1. **Identity Spoofing**: User `attacker@bu.ac.th` tries to create a booking under `victim@bu.ac.th` email.
2. **Self-Approve**: Non-admin user tries to approve their own booking by changing `status` to `"approved"`.
3. **Malformed Date**: Start date is in the past, or end date is before start date.
4. **Room Poisoning**: Attacker injects a 1MB string or high-byte character set into a non-string field or creates a roomId with malformed characters.
5. **No-Verify Access**: Unverified email attempts to write data when verification is required. (Wait! Our rules check for Google Auth, and let's check `email_verified == true`).
6. **Overwrite Admin Records**: Non-admin attempts to create or modify an admin email document in `/admins/{adminId}`.
7. **Bypass Booking Verification**: User saves an approved status when creating a new record.
8. **Staff Spoofing**: Non-admin writes or modifies a `staff` entry.
9. **SQL/Regex Injection** in ID fields: Creating documents with ids containing malicious paths.
10. **Denial of Wallet**: A client triggers O(n) recursively nested database lookups in List rules without limits.
11. **Bypassing Server Timestamps**: Client sets `createdAt` to a custom date instead of `request.time`.
12. **Tampering with Immutable Fields**: Changing a completed booking's `createdAt` or `roomId` during an update.

---

## 3. Security Rules Architecture

We will implement:
- `auth.token.email_verified == true` gate.
- Fixed admin emails allowlist including `"kulachet.l@bu.ac.th"` plus any matching the `admins` collection lookups.
- Strict schema validation.
