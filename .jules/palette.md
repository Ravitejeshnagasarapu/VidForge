## 2026-11-01 - Toast Container Live Regions & Copy Button Accessibility

**Learning:** Ephemeral UI notifications (toasts) appended to static containers without `role="region" aria-live="polite"` and explicit item roles (`role="alert"` for errors, `role="status"` for non-errors) are invisible to screen reader users. Additionally, copy-to-clipboard buttons that only swap visual innerHTML leave assistive tech users without feedback unless the button's `aria-label` is also dynamically updated (e.g., to "Copied to clipboard!") and subsequently restored.

**Action:** Whenever implementing or auditing toast systems and clipboard triggers, declare live regions on the host container and update `aria-label` alongside visual text transitions.
