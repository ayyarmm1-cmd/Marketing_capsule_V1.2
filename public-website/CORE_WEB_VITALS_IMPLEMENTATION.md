# Core Web Vitals Implementation Guide

This document outlines the comprehensive Core Web Vitals assessment and optimization implementation for the Marketing Capsule public website.

## Overview

Core Web Vitals are a set of metrics that measure real-world user experience on web pages. Google uses these metrics as ranking factors in search results.

## Implemented Metrics

### 1. LCP (Largest Contentful Paint)
- **What it measures**: Loading performance
- **Good threshold**: ≤ 2.5 seconds
- **Poor threshold**: > 4.0 seconds
- **Implementation**: Tracked via PerformanceObserver API
- **Optimizations**:
  - Image lazy loading (except for LCP images)
  - Priority loading for critical resources
  - Optimized image formats and sizes

### 2. FID (First Input Delay)
- **What it measures**: Interactivity
- **Good threshold**: ≤ 100 milliseconds
- **Poor threshold**: > 300 milliseconds
- **Implementation**: Tracked via PerformanceObserver API for first-input events
- **Optimizations**:
  - Deferred non-critical JavaScript
  - Code splitting and lazy loading
  - Minimized main thread blocking

### 3. CLS (Cumulative Layout Shift)
- **What it measures**: Visual stability
- **Good threshold**: ≤ 0.1
- **Poor threshold**: > 0.25
- **Implementation**: Tracked via PerformanceObserver API for layout-shift events
- **Optimizations**:
  - Image dimensions specified (width/height attributes)
  - Reserved space for dynamic content
  - Font loading optimization

### 4. FCP (First Contentful Paint)
- **What it measures**: Initial rendering
- **Good threshold**: ≤ 1.8 seconds
- **Poor threshold**: > 3.0 seconds
- **Implementation**: Tracked via PerformanceObserver API for paint events

### 5. TTFB (Time to First Byte)
- **What it measures**: Server response time
- **Good threshold**: ≤ 800 milliseconds
- **Poor threshold**: > 1.8 seconds
- **Implementation**: Tracked via PerformanceNavigationTiming API

## Implementation Details

### Core Web Vitals Utility (`utils/coreWebVitals.ts`)

The utility provides:
- Automatic tracking of all Core Web Vitals metrics
- Real-time reporting to Firebase Analytics
- Performance metrics summary function
- Image optimization helpers
- Resource preloading utilities

### Usage

```typescript
import { initCoreWebVitals, getPerformanceMetrics } from './utils/coreWebVitals';

// Initialize tracking (called once in App.tsx)
initCoreWebVitals();

// Get current metrics
const metrics = getPerformanceMetrics();
```

### Optimized Image Component

Use the `OptimizedImage` component for better LCP scores:

```tsx
import OptimizedImage from '../components/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  priority={true} // For LCP images
  width={800}
  height={600}
/>
```

## SEO and Meta Tags

### Meta Title Tags
All pages now include comprehensive, descriptive meta titles:
- **Homepage**: "Digital Marketing Agency Myanmar | Marketing Capsule - Social Media Marketing, Design & Boosting Services"
- **About**: "About Us | Marketing Capsule - Leading Digital Marketing Agency Myanmar Since 2019"
- **Contact**: "Contact Us | Marketing Capsule - Get Free Marketing Consultation & Quote"
- **Services**: "Digital Marketing Services | Marketing Capsule - Social Media, Design, Boosting & More"
- **Portfolio**: "Portfolio | Marketing Capsule - Our Work & Success Stories"
- **Service Detail**: Dynamic titles based on service name

### Heading Hierarchy
All pages follow proper HTML5 heading hierarchy:
- **h1**: Main page title (one per page)
- **h2**: Major section headings
- **h3**: Subsection headings
- **h4-h6**: Further nested content

## Performance Optimizations

### Image Optimization
1. **Lazy Loading**: All images except LCP images use `loading="lazy"`
2. **Priority Loading**: LCP images use `fetchPriority="high"`
3. **Dimensions**: All images have width/height attributes to prevent layout shift
4. **Format**: Use modern formats (WebP, AVIF) when possible

### Resource Loading
1. **DNS Prefetch**: Prefetch DNS for external resources
2. **Preconnect**: Establish early connections to critical origins
3. **Preload**: Preload critical resources (fonts, CSS)
4. **Defer Scripts**: Defer non-critical JavaScript

### Code Optimization
1. **Code Splitting**: Route-based code splitting
2. **Tree Shaking**: Remove unused code
3. **Minification**: Minify CSS and JavaScript
4. **Compression**: Enable gzip/brotli compression

## Monitoring and Analytics

All Core Web Vitals metrics are automatically tracked and sent to Firebase Analytics with the event name `web_vital`. The data includes:
- Metric name (LCP, FID, CLS, FCP, TTFB)
- Metric value
- Rating (good, needs-improvement, poor)
- Additional metadata

## Best Practices

1. **LCP Optimization**:
   - Optimize images (compress, use modern formats)
   - Preload critical resources
   - Minimize render-blocking resources
   - Use CDN for static assets

2. **FID Optimization**:
   - Minimize JavaScript execution time
   - Break up long tasks
   - Use web workers for heavy computations
   - Optimize event handlers

3. **CLS Optimization**:
   - Always include width and height on images
   - Reserve space for ads and embeds
   - Avoid inserting content above existing content
   - Use transform animations instead of position changes

## Testing

Use the following tools to test Core Web Vitals:
- **Google PageSpeed Insights**: https://pagespeed.web.dev/
- **Chrome DevTools**: Performance tab with Web Vitals overlay
- **Web Vitals Chrome Extension**: Real-time metrics in browser
- **Lighthouse**: Built into Chrome DevTools

## Future Improvements

1. Implement Service Worker for offline support
2. Add resource hints (preload, prefetch) for critical resources
3. Implement image CDN with automatic optimization
4. Add performance budgets to CI/CD pipeline
5. Implement Real User Monitoring (RUM)

## References

- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals](https://web.dev/vitals/#core-web-vitals)
- [Google Search Central - Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
