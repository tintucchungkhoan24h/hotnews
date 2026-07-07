# UX/UI Improvement Plan

## Feature: Article Collapse/Expand

---

# 1. Objectives

## Goals

* Improve the readability of long news pages by reducing the initial page length.
* Allow users to quickly scan headlines and article summaries.
* Enable users to expand only the articles they are interested in.
* Preserve SEO by keeping all article content rendered in the HTML.
* Reuse existing components wherever possible to minimize implementation effort.

---

# 2. Page Layout

## Current Layout

```text
Page Title

Date Filter
Refresh Button

Article 1
Article 2
Article 3
...
```

## Proposed Layout

```text
Page Title

Date Filter
Refresh Button

────────────────────────────
Summary Toolbar
────────────────────────────

Article 1 (Collapsed)

Article 2 (Collapsed)

Article 3 (Collapsed)

...
```

The **Summary Toolbar** will be placed immediately below the existing **Date Filter / Refresh** section and above the article list.

---

# 3. Summary Toolbar

## Purpose

Provide a quick overview of the current page and a single action for expanding or collapsing all articles.

## Components

### Total Articles

Display the total number of articles currently rendered on the page.

Example:

```text
📰 20 Articles
```

The value should automatically update whenever the article list changes (for example, after changing the date range).

### Toggle Button

Use **one button** that changes based on the current page state.

#### Default State

Since all articles are collapsed by default:

```text
[ Expand All ▼ ]
```

Clicking the button expands every article.

#### Expanded State

Once every article is expanded, the button changes to:

```text
[ Collapse All ▲ ]
```

Clicking the button collapses every article and restores the default view.

## Button Behavior

| Page State                  | Button Label     | Action                        |
| --------------------------- | ---------------- | ----------------------------- |
| All articles collapsed      | **Expand All**   | Expand every article          |
| All articles expanded       | **Collapse All** | Collapse every article        |
| Mixed state (some expanded) | **Expand All**   | Expand all remaining articles |

---

# 4. Article Card Layout

## Default State (Collapsed)

All articles are collapsed when the page loads.

### Visible

* Article title
* Publish date
* Language
* **Full lead paragraph**
* Expand indicator (chevron)

### Hidden

* Hero image
* Remaining article content
* References
* Related articles
* Share section (if applicable)

Example:

```text
▼ Top 5 Stocks This Week

05 Jul 2026 • Vietnamese

<Full lead paragraph>
```

---

## Expanded State

### Visible

* Article title
* Publish date
* Language
* Full lead paragraph
* Hero image
* Full article content
* References
* Collapse indicator (chevron)

Example:

```text
▲ Top 5 Stocks This Week

05 Jul 2026 • Vietnamese

<Full lead paragraph>

Hero Image

Article Body

References
```

---

# 5. Interaction Design

## Expand Article

Users can expand an article by clicking anywhere on the article header, including:

* Title
* Header area
* Chevron icon

When expanded:

* Chevron rotates 180°.
* Hero image becomes visible.
* Remaining content expands with a smooth animation.

**Recommended animation duration:** **200–250 ms**

---

## Collapse Article

Users can collapse an article by clicking the article header again.

When collapsed:

* Hero image hides.
* Article body hides.
* Title, metadata, and lead paragraph remain visible.

---

# 6. Global Toggle

The Summary Toolbar provides a single page-level toggle.

## Expand All

When clicked:

* Expand every article currently displayed.
* Update the toolbar button to **Collapse All**.

## Collapse All

When clicked:

* Collapse every article currently displayed.
* Restore the default page view.
* Update the toolbar button to **Expand All**.

---

# 7. Visual Hierarchy

Each article should follow a consistent structure.

```text
Title

↓

Metadata

↓

Lead Paragraph (Always Visible)

↓

──────────────────────────
(Hidden when collapsed)
──────────────────────────

Hero Image

↓

Article Body

↓

References
```

The lead paragraph acts as the article summary and remains visible in both collapsed and expanded states.

---

# 8. Responsive Behavior

## Desktop

```text
📰 20 Articles                         Expand All ▼
```

## Mobile

```text
📰 20 Articles

Expand All ▼
```

### Requirements

* Toolbar adapts naturally to smaller screens.
* Toggle button remains easy to tap.
* Entire article header remains clickable.

---

# 9. Accessibility

Each article should behave as an accessible accordion.

### Requirements

* Entire article header is clickable.
* Keyboard navigation supported:

  * Tab
  * Enter
  * Space
* Proper ARIA attributes:

  * `aria-expanded`
  * `aria-controls`
* Visible keyboard focus indicator.

---

# 10. State Management

Each article maintains its own expansion state.

```text
expanded = true | false
```

The page maintains a global state.

```text
allExpanded = true | false
```

Default value:

```text
allExpanded = false
```

All articles are collapsed on the initial page load.

The toolbar button label is determined by the global state:

* `false` → **Expand All**
* `true` → **Collapse All**

---

# 11. Performance & SEO

To preserve SEO and maintain good performance:

* Render all article HTML during the initial page load.
* Show or hide content using CSS classes (e.g., `max-height`, `overflow`, `opacity`).
* Do not remove article content from the DOM.
* Do not lazy-load article content after expansion.

This ensures:

* Existing SEO is preserved.
* Search engines can index the complete article content.
* Internal links remain crawlable.
* Accessibility is maintained.

---

# 12. Reuse Existing Components

The following components should be reused without modification:

* Date Range Filter
* Refresh Button
* Loading State
* Empty State
* Existing article rendering logic

Only the following new functionality needs to be implemented:

* Summary Toolbar
* Accordion behavior for article cards
* Individual expand/collapse interaction
* Global **Expand All / Collapse All** toggle

---

# 13. Implementation Phases

| Phase | Task                                                       | Deliverable                                                                                                                                                  |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | Add the **Summary Toolbar** below the existing Date Filter | Display the total number of articles and a single **Expand All / Collapse All** toggle button                                                                |
| **2** | Convert each article card into an accordion                | Support individual expand/collapse while preserving the current article layout                                                                               |
| **3** | Set all articles to **collapsed by default**               | Display the title, metadata, and full lead paragraph on initial page load                                                                                    |
| **4** | Implement individual expand/collapse interactions          | Clickable article header, rotating chevron, and smooth expand/collapse animation                                                                             |
| **5** | Implement the global toggle button                         | Allow users to expand or collapse all currently displayed articles with a single action; update the button label dynamically based on the current page state |
| **6** | Optimize responsive layouts                                | Ensure the Summary Toolbar and article cards provide a consistent experience on desktop and mobile devices                                                   |
| **7** | Perform accessibility, performance, and cross-browser QA   | Validate keyboard navigation, ARIA compliance, responsive behavior, browser compatibility, and SEO preservation                                              |
