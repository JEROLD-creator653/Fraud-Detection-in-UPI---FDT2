# Admin Page Transaction Table - Visual Guide

## Professional Table Structure

### Table Layout
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TX ID          │ User    │ Amount      │ Risk  │ Channel │ Type │ Action │ Conf │ Time │ Actions │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ abc123...       │ user_01 │ ₹5,000.00   │ 0.72  │ UPI     │ Pay  │ DELAY  │ HIGH │ 14:23│ 📋 👁️ ✓ ⏱️ ✕ │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ def456...       │ user_02 │ ₹1,500.00   │ 0.45  │ Card    │ Send │ ALLOW  │ MED  │ 14:22│ 📋 👁️ ✓ ⏱️ ✕ │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ghi789...       │ user_03 │ ₹25,000.00  │ 0.91  │ Wallet  │ Req  │ BLOCK  │ HIGH │ 14:21│ 📋 👁️ ✓ ⏱️ ✕ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Column-Based Organization
- **TX ID**: Transaction identifier (monospace, blue)
- **User**: User ID who initiated the transaction
- **Amount**: Transaction amount (₹ formatted, green)
- **Risk**: Risk score (0.00-1.00) with color coding
- **Channel**: Payment channel (UPI, Card, Wallet, etc.)
- **Type**: Transaction type (Pay, Send, Request, etc.)
- **Action**: System decision (ALLOW, DELAY, BLOCK)
- **Confidence**: Confidence level (HIGH, MEDIUM, LOW)
- **Time**: Timestamp of transaction
- **Actions**: Quick action buttons

### 2. Hover Effects

#### Row Hover
- Background color changes to light gradient (#f9fafb → #f3f4f6)
- Smooth transition (0.2s ease)
- Dark mode: (#334155 → #475569)

#### Action Button Visibility
- Buttons hidden by default (opacity: 0)
- Appear on hover (opacity: 1)
- No layout shift - column size remains fixed
- Icon buttons with gradient backgrounds:
  - 📋 (Explainability) - Purple gradient
  - 👁️ (View Details) - Blue gradient
  - ✓ (Allow) - Green gradient
  - ⏱️ (Delay) - Orange gradient
  - ✕ (Block) - Red gradient

### 3. Color Coding

#### Risk Score
- **High Risk** (≥0.8): Red (#dc2626)
- **Medium Risk** (≥0.6): Orange (#ea580c)
- **Low Risk** (<0.6): Green (#16a34a)

#### Action Status
- **BLOCK**: Red border (#dc2626)
- **DELAY**: Yellow border (#eab308)
- **ALLOW**: Green border (#16a34a)

#### Confidence Level
- **HIGH**: Green background (#d1fae5)
- **MEDIUM**: Yellow background (#fef3c7)
- **LOW**: Red background (#fee2e2)

### 4. Responsive Features
- **Sticky Headers**: Remain visible while scrolling
- **Max Height**: 600px with vertical scroll
- **Horizontal Scroll**: Available on narrow screens
- **Proper Column Widths**: 
  - TX ID: min-width 100px
  - User: min-width 90px
  - Amount: min-width 80px
  - Risk: min-width 70px
  - Channel: min-width 85px
  - Type: min-width 75px
  - Action: min-width 75px
  - Confidence: min-width 110px
  - Time: min-width 80px
  - Actions: min-width 230px

### 5. Dark Mode Support
Every element has dark mode styling:
```css
body.dark-mode .professional-tx-table {
  background: #1e293b;
}

body.dark-mode .tx-table-row {
  background: #1e293b;
  border-bottom-color: #334155;
}

body.dark-mode .tx-table-row:hover {
  background: #334155;
}
```

## Before vs After

### Before (Flex Layout Issues)
```
❌ Cramped, unorganized flex layout
❌ Action buttons pushed content around on hover
❌ Confidence level and action shifted center position
❌ Difficult to scan and compare data
❌ Poor column organization
❌ Unprofessional appearance
```

### After (Professional Table)
```
✅ Clean, organized table structure
✅ Fixed action button column - no layout shift
✅ Proper alignment of all elements
✅ Easy to scan and compare data
✅ Clear column headers with sticky positioning
✅ Professional enterprise-grade appearance
✅ Full responsive design support
✅ Accessibility-focused semantic HTML
```

## Button Interactions

### Quick Action Buttons
Each button has specific functionality:

| Button | Function | Icon | Color |
|--------|----------|------|-------|
| Explainability | View fraud detection reasons | 📋 | Purple |
| View Details | Show complete transaction info | 👁️ | Blue |
| Allow | Mark transaction as legitimate | ✓ | Green |
| Delay | Request additional verification | ⏱️ | Orange |
| Block | Reject and report transaction | ✕ | Red |

### Button Hover Effect
```
Before hover: Opacity 0, hidden
On hover:    Opacity 1, visible
Scale:       1.0 → 1.1 (slight zoom)
Shadow:      Added drop shadow
Animation:   Smooth 0.2s ease transition
```

## Accessibility Features
- ✅ Semantic HTML table structure (`<table>`, `<thead>`, `<tbody>`)
- ✅ Proper contrast ratios (WCAG AA compliant)
- ✅ Title attributes on buttons for tooltips
- ✅ Clear visual hierarchy with typography
- ✅ Keyboard navigable (Tab through buttons)
- ✅ Screen reader friendly labels

## Performance Optimizations
- CSS transitions use GPU acceleration (transform, opacity)
- Minimal JavaScript - only rendering updates
- No expensive layout recalculations on hover
- Efficient event delegation
- Sticky headers use native browser support
