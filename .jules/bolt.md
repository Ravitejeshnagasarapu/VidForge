## 2026-10-25 - Avoid getBoundingClientRect() in IntersectionObserver callbacks

**Learning:** Invoking `element.getBoundingClientRect()` inside an `IntersectionObserver` callback triggers forced synchronous layout / reflow on the main thread during fast scrolling. Instead, `entry.boundingClientRect` provides pre-computed bounding rectangle geometry directly from the asynchronous observer frame.

**Action:** In scroll-spy / IntersectionObserver handlers, read `entry.boundingClientRect` rather than querying the DOM or calling `getBoundingClientRect()`.
