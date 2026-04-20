# AI-inbox Development Roadmap

## 1. Roadmap Principles

Development should proceed in the following order:

1. Stabilize information architecture
2. Stabilize state semantics
3. Stabilize core card interactions
4. Build right-side capabilities
5. Complete content lifecycle
6. Refine the visual system

The goal is to avoid repeatedly reworking the foundation while later features are added.

---

## 2. Recommended Phase Order

### Phase 1: Homepage Structure Cleanup

Goals:

- Remove future-version residue from the homepage
- Lock in the three-zone homepage structure
- Clarify naming and module responsibilities

Scope:

- Remove `Write / Read`
- Remove notification entry
- Keep top navigation focused on `Inbox`, Search, Settings
- Define the right-side areas as `Calendar` and `Scratchpad`

### Phase 2: State System Refactor

Goals:

- Replace the old `ready / working / finished` model
- Separate AI lifecycle from content bucket lifecycle

Scope:

- Use Enrich status:
  - `none`
  - `fetching`
  - `success`
  - `failed`
- Use content bucket:
  - `inbox`
  - `collected`
  - `deleted`

### Phase 3: Inbox Card and Action Refactor

Goals:

- Make Inbox cards function as triage units
- Clarify card information order and action priority

Scope:

- Card layout:
  - image if present
  - title
  - AI tags
  - summary
  - toolbar
- Toolbar actions:
  - Enrich
  - Collect
  - Delete

### Phase 4: Calendar Capability

Goals:

- Turn the top-right module into a true time navigator

Scope:

- Month view
- Previous / next month switching
- Today shortcut
- Date-based Inbox filtering
- Date markers for days with content

### Phase 5: Scratchpad Capability

Goals:

- Turn the bottom-right module into a real single-file Markdown workspace

Scope:

- Single persistent file
- Auto-save
- `Edit / Preview`
- Does not enter Inbox
- Does not participate in Enrich

### Phase 6: AI Settings and Enrich Experience

Goals:

- Make AI behavior understandable and controllable

Scope:

- Provider, model, key, base URL
- Test connection
- `aiProcessingMode: off / enhance`
- Auto Enrich
- Manual retry when Enrich fails

### Phase 7: Collect Lifecycle

Goals:

- Turn Collect into a complete content retention flow

Scope:

- Define collected content behavior
- Introduce collected filtering
- Add collected card visuals
- Support toggling collect on and off

### Phase 8: Theme System Refactor

Goals:

- Replace scattered page-level styling with a stable theme system

Scope:

- Global tokens
- Semantic tokens
- Component tokens
- Built-in theme presets
- User-overridable theme file

---

## 3. Batch Plan

### Batch A: Foundation Stabilization

Contains:

- Homepage structure cleanup
- State system refactor
- Inbox card and action refactor

Objective:

- Stabilize homepage semantics and interaction foundations

### Batch B: Right-Side Capability Formation

Contains:

- Calendar capability
- Scratchpad capability

Objective:

- Turn the right-side modules into real product capabilities rather than placeholders

### Batch C: Lifecycle and Visual System

Contains:

- AI settings and Enrich experience
- Collect lifecycle
- Theme system refactor

Objective:

- Complete the content lifecycle and polish the product system

---

## 4. Detailed Batch A Breakdown

### A-1 Homepage Structure Cleanup

Tasks:

- Remove `Write`
- Remove `Read`
- Remove notification entry
- Keep top navigation focused on `Inbox`, Search, Settings
- Use `Inbox` as the current brand mark
- Reserve the brand mark area for a future logo image
- Clarify the right-side regions as `Calendar` and `Scratchpad`

Acceptance:

- The homepage contains no current-version-irrelevant modes
- Users can immediately understand the role of each area

### A-2 State System Refactor

Tasks:

- Remove old status semantics from the main flow
- Use Enrich status:
  - `Raw`
  - `Fetching`
  - `Success`
  - `Failed`
- Treat article ownership as a separate property:
  - `inbox`
  - `collected`
  - `deleted`
- Hide deleted items by default

Acceptance:

- AI lifecycle and content ownership are clearly separated
- User-facing status language is consistent

### A-3 Inbox Card and Action Refactor

Tasks:

- Support two card layouts: with image / without image
- Use the card structure:
  - image
  - title
  - AI tags
  - summary
  - toolbar
- Place `Enrich` on the left side of the toolbar
- Place `Collect` and `Delete` on the right side of the toolbar
- Make `Collect` a reversible star action
- Give collected cards special background and a semi-transparent crown mark
- Place the filter entry in the top-right of the content area header

Acceptance:

- Cards clearly communicate what the item is, what AI has done, and what the user can do next
- Collected items are visually distinct from regular Inbox items

---

## 5. Current Product Decisions to Preserve

These decisions were already agreed and should be treated as the current baseline:

- The main stream is called `Inbox`
- The temporary editor is called `Scratchpad`
- `Read` is future scope and is not part of the current homepage
- `Collect` means star / favorite / retained note
- Deleted items are hidden by default
- Enrich display copy uses:
  - `Raw`
  - `Fetching`
  - `Success`
  - `Failed`
- Collected cards use a special background and a crown mark
- Scratchpad placeholder is:
  - `临时笔记，随便写点什么吧`

---

## 6. Conversation Planning Note

The current conversation is a good place to continue any work tied to:

- Homepage structure
- Batch A, B, or C execution details
- Calendar and Scratchpad planning
- Collect and Enrich user flow refinement

A new chat is recommended later when the topic shifts into a separate major domain, for example:

- Dedicated theme system specification
- Future `Read` product definition
- Knowledge base architecture for collected notes
- Public MCP protocol design
