Create a modern, professional UX Request Portal web application for an internal enterprise banking organization.

The purpose of this website is to allow business stakeholders to:

1. Submit a new UX request.
2. Understand the current workload and availability of UX Squads before submitting a request.
3. Track existing UX requests and their progress.

IMPORTANT:

* This is an MVP.
* Focus on a clean, simple, professional experience.
* Do NOT build an admin dashboard for UX designers.
* UX designers and UX leads will manage the underlying data directly in Google Sheets.
* The website is primarily for Stakeholders.
* Use realistic mock data for now, but structure the application so the mock data can later be replaced by Google Apps Script API responses from Google Sheets.
* Do not hard-code the data structure in a way that makes API integration difficult later.

==================================================

1. OVERALL INFORMATION ARCHITECTURE
   ==================================================

Create a simple top navigation:

* UX Request Portal
* Create Request
* Track Request

Header:

* UX Request Portal logo / wordmark
* Navigation
* Simple user profile area showing the current stakeholder email
* Optional avatar

Primary user journeys:

A. Create Request
Stakeholder checks UX Squad workload → fills request form → submits request → receives Request ID.

B. Track Request
Stakeholder enters email or Request ID → sees request list → opens request detail → sees UX progress and latest updates.

==================================================
2. CREATE REQUEST PAGE
======================

This is the primary landing page.

The page should have two major sections:

SECTION A — UX CAPACITY OVERVIEW

Place this section BEFORE the request form.

Purpose:
Help Stakeholders understand whether UX Squads are currently busy or have available capacity before submitting a request.

Section title:
"UX Squad Availability"

Subtitle:
"See the current workload of each UX Squad before submitting your request."

Create a responsive squad capacity overview using cards.

Each Squad card should display:

* Squad name
* Squad domain / responsibility
* Active Tasks
* Queued Tasks
* Capacity status
* Simple visual workload indicator

Example mock squads:

1. Payments Squad
   Domain: Payments & Transfers
   Active Tasks: 6
   Queued Tasks: 4
   Capacity Status: Busy

2. Daily Banking Squad
   Domain: Accounts & Daily Banking
   Active Tasks: 3
   Queued Tasks: 2
   Capacity Status: Available

3. Lending Squad
   Domain: Loans & Credit
   Active Tasks: 7
   Queued Tasks: 5
   Capacity Status: High Load

4. Wealth Squad
   Domain: Investment & Wealth
   Active Tasks: 2
   Queued Tasks: 1
   Capacity Status: Available

Capacity status should be derived from the workload data, not manually hard-coded in the UI.

For example:

* Available
* Moderate
* Busy
* High Load

Use a simple visual system:

* Progress bar or workload bar
* Active task count
* Queued task count
* Small status indicator

Do not use excessive colors. Keep the visual language professional and enterprise-oriented.

Each card should have a "View Squad" or "View Details" action.

When clicked, show a lightweight modal or expandable panel with:

* Squad name
* Squad domain
* Current active tasks
* Current queued tasks
* List of active task titles
* List of queued task titles
* Current UX owner if available

Example:

Payments Squad

Active:

* International Transfer Redesign
* Bulk Transfer Experience
* QR Payment Improvement

Queued:

* Payment Confirmation Redesign
* Transfer History Search

The task list should be read-only for Stakeholders.

==================================================
3. DATA STRUCTURE FOR FUTURE GOOGLE SHEETS API
==============================================

Prepare the frontend architecture to eventually load squad capacity from Google Apps Script API.

Do NOT connect to a real API yet.

Use mock data in a centralized data service or mock API layer.

Expected future API concept:

GET /squads

Expected response:

[
{
"squad_id": "SQ001",
"squad_name": "Payments Squad",
"domain": "Payments & Transfers",
"active_tasks": 6,
"queued_tasks": 4,
"capacity_status": "BUSY"
}
]

The UI should calculate or display capacity based on:

* Active task count
* Queued task count
* Optional capacity threshold

Do not make the UI dependent on hard-coded squad names.

The squad cards should be dynamically rendered from the data array.

==================================================
4. CREATE REQUEST FORM
======================

Below the UX Squad Availability section, create the request form.

Section title:
"Submit a UX Request"

Subtitle:
"Tell us what you need help with. The UX team will review your request and get back to you."

Keep the form concise.

Group 1 — Request Information

Fields:

* Request Title
* Product / Platform
* Request Type
* Feature / Journey
* Request Description

Request Type options:

* New Feature
* Redesign Existing Experience
* Improve Existing Experience
* UX Research
* UX Review
* Other

Group 2 — Business Context

Fields:

* Why is this request needed?
* What business problem are you trying to solve?
* What user problem are you trying to solve?
* Target User

Group 3 — Expected Outcome

Fields:

* What do you expect UX to deliver?
* Expected UX Output

Options:

* UX Recommendation
* User Flow
* Wireframe
* UI Design
* Prototype
* UX Research
* Usability Testing
* Not sure / Need UX consultation

Group 4 — Timeline

Fields:

* Expected Deadline
* Why is this deadline important?

Deadline reason options:

* Product Launch
* Business Commitment
* Regulatory Requirement
* Marketing Campaign
* Internal Review
* Other

Group 5 — Attachments

Allow file upload.

Supported examples:

* PDF
* DOCX
* PPTX
* XLSX
* PNG
* JPG

Show uploaded files as compact file cards.

==================================================
5. SMART SQUAD RECOMMENDATION
=============================

After the stakeholder selects:

* Product
* Feature / Journey
* Request Type

Show a lightweight recommendation:

"Recommended UX Squad"

Example:

Payments Squad
Best match for your request based on the selected product and feature.

Also show:

"Current workload"
6 Active · 4 Queued · Busy

This is only a recommendation.

The Stakeholder should NOT manually assign the UX owner.

Allow an optional field:

"Preferred Squad"
Dropdown:

* No preference
* Payments Squad
* Daily Banking Squad
* Lending Squad
* Wealth Squad

Add helper text:

"The UX team will review your request and assign the most appropriate Squad."

The recommendation should be visually connected to the capacity overview above.

==================================================
6. SUBMIT EXPERIENCE
====================

Primary CTA:

"Submit UX Request"

Before submission, show a compact summary:

Request:
[Request Title]

Recommended Squad:
[Squad Name]

Expected Deadline:
[Date]

After successful submission, show a success screen:

"Request submitted successfully"

Display:

Request ID
UX-2026-001

Message:

"Your request has been received by the UX team."

Actions:

* Track this request
* Submit another request

The Request ID should be generated by the backend in the future.

For now use mock IDs.

==================================================
7. TRACK REQUEST PAGE
=====================

Create a separate page called:

"Track Your UX Requests"

Top search area:

"Enter your email or Request ID"

Input placeholder:
"[you@company.com](mailto:you@company.com) or UX-2026-001"

Primary CTA:
"Search"

Results should show request cards.

Each card:

* Request ID
* Request title
* Product
* UX Squad
* UX Owner
* Current Phase
* Status
* Progress percentage
* Last Updated

Example:

UX-2026-001
International Transfer Redesign

Payments Squad
UI Design
60%
In Progress

Last updated:
03 Aug 2026

Clicking a card opens Request Detail.

==================================================
8. REQUEST DETAIL PAGE
======================

Show:

Request title
Request ID
Status
Progress

Section 1:
"Request Information"

Display:

* Requester
* Product
* Request Type
* Description
* Business Need
* User Problem
* Expected Outcome
* Expected Deadline

Section 2:
"UX Progress"

Display a horizontal or vertical progress timeline:

Request Submitted
Completed

Triage
Completed

Discovery
Completed

User Flow
Completed

UI Design
In Progress

Prototype
Upcoming

Delivery
Upcoming

Section 3:
"Latest UX Update"

Show:

* Update date
* Current phase
* Update message

Example:

03 Aug 2026

UI Design — In Progress

"The UX team is currently refining the UI and preparing the first review."

Section 4:
"UX Team"

Show:

* Squad
* UX Owner

Section 5:
"Deliverables"

Show buttons:

* View Figma
* View Prototype
* View UX Specification

Only show buttons when URLs exist.

==================================================
9. VISUAL DESIGN
================

Design direction:

* Modern enterprise UX
* Premium banking technology aesthetic
* Clean and minimal
* High information clarity
* Strong hierarchy
* Spacious layout
* Professional typography
* Rounded cards
* Subtle borders and shadows
* Smooth hover states
* Responsive desktop-first design
* Mobile responsive

Avoid:

* Excessive gradients
* Gamification
* Overly colorful dashboard visuals
* Complex charts
* Dense tables
* Unnecessary animations

The visual hierarchy should make the primary journey extremely clear:

1. Check UX Squad availability
2. Submit request
3. Track request

==================================================
10. IMPORTANT FRONTEND ARCHITECTURE
===================================

Build reusable components:

* SquadCapacityCard
* SquadCapacityOverview
* RequestForm
* RequestTypeSelector
* SquadRecommendation
* FileUpload
* RequestCard
* RequestList
* RequestDetail
* UXProgressTimeline
* LatestUpdate
* Deliverables

Create a centralized mock data layer:

mockSquads
mockRequests
mockTaskUpdates

Do NOT duplicate mock data inside individual components.

Structure the code so the mock data can later be replaced by:

Google Apps Script API
→ Google Sheets

Future API endpoints:

GET /squads
POST /create-request
GET /search?query=
GET /task?id=
GET /updates?task_id=

The frontend should not directly access Google Sheets.

The frontend should call an API layer.

For now, use mock data and simulate API loading states.

Include:

* Loading state
* Empty state
* Error state
* Successful submission state

The final result should be a polished clickable prototype of the UX Request Portal, with Create Request and Track Request as the two primary user journeys.
