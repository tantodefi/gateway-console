# fn-2.5 Convert dialogs to mobile-responsive sheets

## Description

Convert all dialogs to be mobile-responsive by using Drawer on mobile and Dialog on desktop.

**Pattern:**
Create a `ResponsiveDialog` wrapper component that:
- Renders `Dialog` on desktop (>= 768px)
- Renders `Drawer` on mobile (< 768px)

**Create:** `/src/components/ui/responsive-dialog.tsx`

**Dialogs to update:**
1. `/src/components/messaging/NewConversationDialog.tsx`
2. `/src/components/messaging/NewGroupDialog.tsx`
3. `/src/components/messaging/GroupSettingsDialog.tsx`
4. `/src/components/messaging/AddUserDialog.tsx`
5. `/src/components/faucet/FaucetDialog.tsx`
6. `/src/components/deposit/DepositDialog.tsx`

**Implementation:**
```tsx
// ResponsiveDialog uses same props as Dialog
// Internally chooses Dialog or Drawer based on viewport

import { useIsMobile } from "@/hooks/useResponsiveLayout";

export function ResponsiveDialog({ children, ...props }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Drawer {...props}>{children}</Drawer>;
  }
  return <Dialog {...props}>{children}</Dialog>;
}
```

**Also export:**
- `ResponsiveDialogContent`
- `ResponsiveDialogHeader`
- `ResponsiveDialogTitle`
- `ResponsiveDialogDescription`
- `ResponsiveDialogFooter`

These map to the correct Dialog/Drawer sub-components based on viewport.

## Files to reference

- `/src/components/ui/dialog.tsx` - Dialog component structure
- `/src/components/ui/drawer.tsx` - Drawer component structure
## Acceptance
- [ ] ResponsiveDialog component created
- [ ] All 6 dialogs updated to use ResponsiveDialog
- [ ] Dialogs appear as bottom sheets on mobile
- [ ] Dialogs appear as centered modals on desktop
- [ ] Dialog content is scrollable if it overflows on mobile
- [ ] No horizontal scroll in any dialog on 320px viewport
- [ ] `npm run typecheck` passes
## Done summary
- What changed:
  - Created ResponsiveDialog component that switches between Dialog (desktop) and Drawer (mobile)
  - Updated all 6 dialogs (NewConversationDialog, NewGroupDialog, GroupSettingsDialog, FaucetDialog, DepositDialog, AddUserDialog) to use ResponsiveDialog
  - Dialogs now appear as scrollable bottom sheets on mobile viewports

- Why:
  - Improves mobile UX by using touch-friendly bottom sheet pattern
  - Maintains desktop experience with centered modals

- Verification:
  - npm run typecheck passes
  - All dialog components compile correctly

- Follow-ups:
  - Test on real mobile devices to verify touch interactions
## Evidence
- Commits: bb313ef50d6218b2973201780cb93181376af265
- Tests: npm run typecheck
- PRs: