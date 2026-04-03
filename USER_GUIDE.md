# MadaSoa Transit User Guide

## Overview

MadaSoa Transit is a bilingual shipment tracking and logistics app with two main areas:

- A public tracking portal for customers
- An internal admin suite for operations, finance, and administrators

The app supports two languages:

- English at `/en`
- French at `/fr`

## Main Areas

### Public Portal

Use the public portal to look up shipment information without signing in.

Main entry points:

- `/en`
- `/fr`

Public users can:

- Search by China tracking number or internal tracking number
- Search by client reference
- Filter client-reference searches by transport type
- Open a shipment details panel
- View route progress, ETA, payment state, weight, volume, and charges

Important public portal rules:

- Client-reference lookup only shows public shipments with an outstanding balance
- Hidden shipments do not appear publicly
- Public lookup is rate-limited to reduce abuse

### Admin Suite

Use the admin suite to manage intake, shipments, customers, imports, reporting, and team access.

Main entry points:

- `/en/admin/login`
- `/fr/admin/login`

After sign-in, users only see the sections allowed for their role.

## Seed Login Accounts

If the database has been seeded, these logins are available:

- Admin: `admin@madasoatransit.local` / `Admin123!`
- Operator: `operator@madasoatransit.local` / `Operator123!`
- Finance: `finance@madasoatransit.local` / `Finance123!`

These accounts come from the seed script and should be changed for real production use.

## Role Summary

| Role | Main Purpose | Can Access |
| --- | --- | --- |
| `admin` | Full control of the platform | Dashboard, Intake, Shipments, Customers, Imports, Reports, Team |
| `operator` | Day-to-day warehouse and shipment operations | Dashboard, Intake, Shipments, Customers, Imports, Reports |
| `finance` | Payment and reporting follow-up | Dashboard, Shipments, Customers, Reports |

## Role Permissions Matrix

| Feature | Admin | Operator | Finance |
| --- | --- | --- | --- |
| View dashboard | Yes | Yes | Yes |
| Use intake workflow | Yes | Yes | No |
| Create shipments | Yes | Yes | No |
| Edit operational shipment fields | Yes | Yes | No |
| Edit finance shipment fields | Yes | No | Yes |
| Search and view customers | Yes | Yes | Yes |
| Create customers | Yes | Yes | No |
| Preview and commit imports | Yes | Yes | No |
| View reports | Yes | Yes | Yes |
| View team list | Yes | No | No |
| Create team users | Yes | No | No |

## Shared Navigation and UI

All signed-in users can use:

- Language switcher to move between English and French
- Theme toggle
- Sign out action
- Dashboard cards and section navigation that are filtered by role

## How To Use The Public Portal

### 1. Search by tracking number

Use this when you know the China tracking number or the internal shipment number.

Steps:

1. Open `/en` or `/fr`
2. Stay on the tracking tab
3. Enter the China tracking number or internal tracking number
4. Click `Search`
5. Review the shipment summary
6. Click `Open details` to see the detailed shipment sheet

Tracking results can show:

- Current status
- Route stage
- Origin and destination
- Customer
- Carrier
- ETA
- Actual weight
- Volumetric weight
- Volume
- Freight amount
- Payment status
- Shipment timeline

### 2. Search by client reference

Use this when a customer knows their internal reference rather than a parcel number.

Steps:

1. Open `/en` or `/fr`
2. Switch to the client-reference tab
3. Enter the client reference
4. Choose the transport type
5. Click `Search`
6. Review the list of open shipments
7. Open any shipment details if needed

This mode is intended for outstanding cases and not for every historical shipment.

## How To Use The Admin Suite

### 1. Sign in

Steps:

1. Open `/en/admin/login` or `/fr/admin/login`
2. Enter your email and password
3. Click `Submit`
4. You will be redirected to the admin dashboard

### 2. Dashboard

The dashboard gives a quick operational summary.

It shows:

- Total shipments
- Outstanding cases
- Delivered shipments
- Import count
- Recent shipments
- Recent imports

Use it as the starting point for daily work.

## Admin Role Guide

The `admin` role has full access across the platform.

### Typical admin responsibilities

- Oversee the entire operation
- Create and update shipments
- Manage intake and unassigned parcels
- Create customers
- Run spreadsheet imports
- Review reports
- Manage team accounts
- Adjust payment-related shipment fields

### Admin workflow by section

#### Intake

Use Intake for newly received parcels in the warehouse.

Workflow:

1. Scan a parcel using:
   - a hardware scanner
   - the manual scan field
   - the live camera scanner
2. Review the scan preview
3. Confirm or correct:
   - China tracking number
   - customer
   - actual weight
   - declared value
   - transport type
   - courier company
   - declared currency
   - shelf location
   - notes
4. Create the shipment immediately, or save the parcel as unassigned
5. If saved as unassigned, assign it later from the unassigned queue

Extra admin capabilities:

- Search existing customers during intake
- Quick-create a customer inline without leaving Intake
- Assign unassigned parcels and create shipments later

#### Shipments

Admins can create new shipments and edit all shipment fields.

Create flow:

1. Open `Shipments`
2. Open `New shipment`
3. Fill required fields:
   - tracking number
   - customer
   - customer reference
   - origin
   - destination
   - status
4. Add optional fields such as:
   - transport type
   - carrier
   - actual weight
   - volumetric weight
   - volume
   - ETA
   - notes
   - public visibility
   - freight amount
   - currency
   - payment status

Admin edit rights include both operational and finance fields.

#### Customers

Admins can:

- Search customers
- Create customers
- Add customer code and reference prefix
- Store receiver aliases
- Store China phone numbers
- Store marketplace or label aliases

This page is the source of truth for customer matching during intake and imports.

#### Imports

Admins can preview and commit shipment imports from spreadsheet files.

Accepted file types:

- `.csv`
- `.xlsx`
- `.xls`

Required import columns:

- `trackingNumber`
- `customerReference`
- `customerName`
- `origin`
- `destination`
- `currentStatus`
- `paymentStatus`

Import flow:

1. Upload a file
2. Click `Preview`
3. Review valid rows
4. Review validation errors
5. Fix the source file if needed
6. Click `Commit import`
7. Review the import history cards

#### Reports

Admins can review:

- Shipment counts by status
- Outstanding shipments by customer
- Monthly shipment volume
- Import history summary

#### Team

Admins can:

- View the team list
- Add new team members
- Assign one of three roles: `admin`, `operator`, or `finance`

## Operator Role Guide

The `operator` role is for warehouse and shipment operations.

### Typical operator responsibilities

- Receive incoming parcels
- Match parcels to customers
- Create shipments
- Update operational shipment details
- Maintain customer records
- Run imports
- Review reports

### What operators can do

#### Intake

Operators have the same intake workflow access as admins:

- scan parcels
- use live camera scan
- review preview results
- select an existing customer
- quick-create a customer during intake
- confirm weight, value, transport, shelf, and notes
- create a shipment
- save to unassigned
- assign from the unassigned queue later

#### Shipments

Operators can create shipments and edit operational fields only.

Operator-editable shipment fields:

- customer reference
- transport type
- origin
- destination
- carrier
- current status
- actual weight
- volumetric weight
- volume
- ETA
- notes
- public visibility

Operators cannot edit finance-only shipment fields:

- payment status
- freight amount
- currency

#### Customers

Operators can:

- search customer records
- create customers
- manage aliases and contact details during customer creation

#### Imports

Operators can:

- upload CSV/XLSX files
- preview rows
- review import errors
- commit valid imports

#### Reports

Operators can review reporting pages for operational follow-up.

### What operators cannot do

- Manage team accounts
- Edit finance-only shipment fields
- Access the Team page

## Finance Role Guide

The `finance` role is focused on payment tracking and business reporting.

### Typical finance responsibilities

- Review open balances
- Update payment-related shipment fields
- Check customer accounts
- Track outstanding shipments in reports

### What finance users can do

#### Dashboard

Finance users can use the dashboard to monitor:

- total shipments
- outstanding cases
- delivered count
- import activity summary

#### Shipments

Finance users cannot create shipments, but they can update finance-only shipment fields.

Finance-editable shipment fields:

- payment status
- freight amount
- currency

This allows finance to update billing state without changing logistics data.

#### Customers

Finance users can search and review customer records for reference and account follow-up.

#### Reports

Finance users can review:

- outstanding by customer
- shipment status mix
- monthly volume
- import history

### What finance users cannot do

- Use Intake
- Create shipments
- Create customers
- Run imports
- Manage team accounts
- Edit operational shipment fields

## Recommended Daily Workflows

### Warehouse intake workflow

Best for admins and operators:

1. Receive parcel
2. Scan parcel label
3. Review suggested tracking and customer match
4. Confirm actual weight and declared value
5. Set transport type and optional notes
6. Create shipment or save as unassigned

### Spreadsheet import workflow

Best for admins and operators:

1. Prepare CSV/XLSX file with required columns
2. Preview the import
3. Fix invalid rows
4. Commit the import
5. Review import history

### Finance follow-up workflow

Best for finance and admins:

1. Open `Reports`
2. Review `Outstanding by customer`
3. Open `Shipments`
4. Update `paymentStatus`, `freightAmount`, or `currency`
5. Confirm the shipment remains correctly visible for public tracking if needed

## Important Notes

- Public visibility matters. A shipment marked as hidden will not appear in the public portal.
- Client-reference public search is intended for outstanding shipments.
- Intake requires operational confirmation. The scan helps, but operators still confirm weight, value, and transport manually.
- Team management is admin-only.
- Finance edits are intentionally limited to billing-related fields.

## Deployment and Setup Notes

For a fresh environment to work correctly:

1. Apply Prisma migrations
2. Seed the database
3. Sign in with a seeded or custom team account

Useful commands:

```bash
npm run prisma:migrate:deploy
npm run db:seed
```

If the database is empty, login accounts and admin data will not exist yet.
