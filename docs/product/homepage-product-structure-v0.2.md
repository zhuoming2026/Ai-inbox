# AI-inbox Homepage Product Structure v0.2

## 1. Product Positioning

AI-inbox is an information capture and triage application centered on the `Inbox`.

Users input text, links, images, and other materials into the app. The system first persists the content locally into `Inbox`, then supports AI `Enrich`, manual review, `Collect`, or `Delete`.

The homepage is responsible for capture, browsing, and triage. It does not include the future `Read` product scope.

---

## 2. Homepage Goals

1. Fast capture: every input should enter the system immediately.
2. Fast browsing: users should be able to review content by date and filter.
3. Fast triage: users should be able to `Enrich`, `Collect`, and `Delete` items efficiently.

---

## 3. Page Structure

### 3.1 Top Navigation

Responsibilities:

- Brand entry
- Search within Inbox content
- Settings entry

Contains:

- `Inbox` brand mark
- Search
- Settings

Notes:

- Remove `Write / Read`
- Remove notification entry
- The current text `Inbox` should later be replaceable with a logo image while keeping the same placement and role

### 3.2 Left Main Area: Inbox

Name: `Inbox`

Responsibilities:

- Display all captured content
- Browse content grouped by date
- Open item detail
- Trigger `Enrich`
- Trigger `Collect`
- Trigger `Delete`

Not responsible for:

- Temporary drafting
- Reader product features
- Knowledge base management

Definition:

Inbox is a stream of items waiting to be organized. It is not the final notes library.

### 3.3 Top Right Area: Calendar

Name: `Calendar`

Responsibilities:

- Act as a time navigator for Inbox
- Provide month view browsing
- Support switching months
- Support filtering Inbox by date

Not responsible for:

- Schedule management
- Reminders
- Meetings

Header guidance:

- Explicitly show `Calendar`
- Also show the current month

### 3.4 Bottom Right Area: Scratchpad

Name: `Scratchpad`

Responsibilities:

- Provide a single-file temporary Markdown workspace
- Support lightweight note-taking while processing Inbox items
- Support `Edit / Preview`

Not responsible for:

- Entering the Inbox stream
- AI Enrich
- Collect
- Formal note management

Empty state placeholder:

`临时笔记，随便写点什么吧`

Definition:

Scratchpad is a temporary workspace, not a second document system.

---

## 4. Object Model

### 4.1 Inbox Item

Sources:

- App input
- MCP input
- Future input sources

Characteristics:

- Belongs to the Inbox stream
- Can be enriched
- Can be collected
- Can be deleted

### 4.2 Scratchpad

Characteristics:

- Only one file exists
- Auto-saved
- Does not enter the Inbox stream

### 4.3 Collected Note

Source:

- An Inbox Item after being collected

Characteristics:

- Represents content explicitly kept by the user
- Serves as retained content
- Can later be filtered independently

---

## 5. State System

### 5.1 Enrich Status

Used to represent the AI lifecycle.

State values:

- `none`
- `fetching`
- `success`
- `failed`

Display copy:

- `Raw`
- `Fetching`
- `Success`
- `Failed`

Visual language direction:

- `Raw`: plain box
- `Fetching`: bouncing box
- `Success`: smiling box
- `Failed`: sad box

Notes:

- `Raw` means AI enrich has not yet completed
- `Fetching` should block duplicate enrich triggers
- `Failed` allows manual retry
- `Success` indicates AI enhancement completed

### 5.2 Content Bucket

Used to represent which collection an article belongs to.

State values:

- `inbox`
- `collected`
- `deleted`

Notes:

- `deleted` is hidden by default
- `collected` should be visually distinct from regular Inbox items
- Content bucket and Enrich status must remain separate concepts

---

## 6. Homepage Core Flows

### 6.1 Capture Flow

1. User inputs content.
2. The system immediately creates a local Inbox Item.
3. The UI immediately shows the card.
4. If auto Enrich is enabled, the system triggers AI enrich in the background.
5. On success, frontmatter and body are updated.
6. On failure, only the Enrich status is updated. The file must remain.

### 6.2 Manual Enrich Flow

1. Card is in `Raw` or `Failed`.
2. User clicks `Enrich`.
3. The system retries AI enrich.
4. On success, the card becomes `Success`.
5. On failure, it remains `Failed`.

### 6.3 Collect Flow

1. User clicks the star icon.
2. Content bucket becomes `collected`.
3. The card switches to Collected visual style.
4. Clicking the star again returns it to `inbox`.

### 6.4 Delete Flow

1. User clicks delete.
2. Content bucket becomes `deleted`.
3. The item is hidden from the default view.

---

## 7. Inbox Card Design

### 7.1 Card Types

Current card types:

- Card without image
- Card with image

These should differ only by layout, not by interaction logic.

### 7.2 Card Structure

From top to bottom:

1. Image, if present
2. Title, maximum two lines
3. AI-generated tags, maximum one line
4. Summary, maximum three lines
5. Status toolbar

### 7.3 Toolbar Layout

- Left: `Enrich`
- Right: `Collect`, `Delete`

Notes:

- `Enrich` should carry both status display and action entry
- `Collect` uses a star icon and can be toggled off
- `Delete` is a secondary destructive action

---

## 8. Collected Card Definition

Collected items require independent visual identity:

- Special background
- Fixed semi-transparent crown mark in the top-right corner

Meaning:

- The user has intentionally kept this content
- This does not mean AI succeeded or failed
- This reflects bucket change, not Enrich change

---

## 9. Filtering System

### 9.1 Filter Placement

- Place the filter entry on the top-right of the left content area
- Keep it on the same horizontal line as the date heading

### 9.2 Initial Filter Options

- `Inbox`
- `Collected`

Notes:

- `Deleted` stays hidden by default and does not need to be shown in the first version
- `Deleted` or `All` can be added later

Content area header suggestion:

- Left: date heading such as `今天`
- Right: filter entry

---

## 10. Current Scope Boundaries

Included on the current homepage:

- Inbox
- Calendar
- Scratchpad
- Enrich
- Collect
- Delete

Excluded from current scope:

- Read mode
- RSS reader
- AI daily digest
- Full knowledge base browsing
- Multi-file Scratchpad
- Scheduling features

---

## 11. Design Principles

1. Inbox is the center of the homepage. Other areas serve the Inbox workflow.
2. Scratchpad must stay lightweight and must not evolve into a second document system.
3. Enrich is an enhancement layer and must not block capture.
4. Collect is a retention action and must remain separate from Enrich.
5. Deleted items stay hidden by default to keep Inbox clean.
6. Future visual upgrades should be built on a stable structure rather than replacing the structure itself.

---

## 12. Batch A Summary

Batch A includes:

- A-1: Homepage structure cleanup
- A-2: State system refactor
- A-3: Inbox card and action refactor

Batch A is complete when:

1. The three homepage areas have clear responsibilities.
2. The old status system is fully removed from the user-facing flow.
3. Inbox card structure is stable.
4. Enrich, Collect, and Delete are clearly separated in meaning.
5. Future work on Calendar and Scratchpad will not require rethinking the homepage foundation.
