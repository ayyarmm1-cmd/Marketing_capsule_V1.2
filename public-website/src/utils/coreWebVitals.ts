/**
 * Core Web Vitals Assessment and Tracking
 * 
 * This utility tracks and reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - FID (First Input Delay): Measures interactivity
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - FCP (First Contentful Paint): Measures initial rendering
 * - TTFB (Time to First Byte): Measures server response time
 */

import { analytics } from '../config/firebase';
import { logEvent } from 'firebase/analytics';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

interface CoreWebVitalsReport {
  lcp?: WebVitalMetric;
  fid?: WebVitalMetric;
  cls?: WebVitalMetric;
  fcp?: WebVitalMetric;
  ttfb?: WebVitalMetric;
}

// Thresholds for Core Web Vitals (in milliseconds or score)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  FID: { good: 100, poor: 300 }, // milliseconds
  CLS: { good: 0.1, poor: 0.25 }, // score
  FCP: { good: 1800, poor: 3000 }, // milliseconds
  TTFB: { good: 800, poor: 1800 }, // milliseconds
};

/**
 * Determine rating based on threshold
 */
function getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Track Core Web Vitals to analytics
 */
function trackWebVital(metric: WebVitalMetric) {
  if (analytics) {
    logEvent(analytics, 'web_vital', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      metric_id: metric.id,
    });
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Core Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      threshold: THRESHOLDS[metric.name as keyof typeof THRESHOLDS],
    });
  }
}

/**
 * Initialize Core Web Vitals tracking
 */
export function initCoreWebVitals() {
  // Check if browser supports PerformanceObserver
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    console.warn('PerformanceObserver not supported');
    return;
  }

  // Track LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
      };

      const lcpValue = lastEntry.renderTime || lastEntry.loadTime || 0;
      const metric: WebVitalMetric = {
        name: 'LCP',
        value: lcpValue,
        rating: getRating(lcpValue, THRESHOLDS.LCP),
        id: lastEntry.entryType,
      };

      trackWebVital(metric);
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP tracking failed:', e);
  }

  // Track FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as any; // PerformanceEventTiming
        const fidValue = fidEntry.processingStart - fidEntry.startTime;

        const metric: WebVitalMetric = {
          name: 'FID',
          value: fidValue,
          rating: getRating(fidValue, THRESHOLDS.FID),
          id: fidEntry.name,
        };

        trackWebVital(metric);
      });
    });

    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID tracking failed:', e);
  }

  // Track CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      const metric: WebVitalMetric = {
        name: 'CLS',
        value: clsValue,
        rating: getRating(clsValue, THRESHOLDS.CLS),
      };

      // Report CLS on page unload or visibility change
      if (document.visibilityState === 'hidden') {
        trackWebVital(metric);
      }
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Report final CLS on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const finalMetric: WebVitalMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, THRESHOLDS.CLS),
        };
        trackWebVital(finalMetric);
      }
    });
  } catch (e) {
    console.warn('CLS tracking failed:', e);
  }

  // Track FCP (First Contentful Paint)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const fcpValue = entry.startTime;
          const metric: WebVitalMetric = {
            name: 'FCP',
            value: fcpValue,
            rating: getRating(fcpValue, THRESHOLDS.FCP),
          };
          trackWebVital(metric);
        }
      });
    });

    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('FCP tracking failed:', e);
  }

  // Track TTFB (Time to First Byte)
  try {
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as any; // PerformanceNavigationTiming
          const ttfbValue = navEntry.responseStart - navEntry.requestStart;

          const metric: WebVitalMetric = {
            name: 'TTFB',
            value: ttfbValue,
            rating: getRating(ttfbValue, THRESHOLDS.TTFB),
          };

          trackWebVital(metric);
        }
      });
    });

    navigationObserver.observe({ entryTypes: ['navigation'] });
  } catch (e) {
    console.warn('TTFB tracking failed:', e);
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics(): CoreWebVitalsReport {
  const report: CoreWebVitalsReport = {};

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as any; // PerformanceNavigationTiming
    const paintEntries = performance.getEntriesByType('paint');
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');

    // TTFB
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.requestStart;
      report.ttfb = {
        name: 'TTFB',
        value: ttfb,
        rating: getRating(ttfb, THRESHOLDS.TTFB),
      };
    }

    // FCP
    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      report.fcp = {
        name: 'FCP',
        value: fcpEntry.startTime,
        rating: getRating(fcpEntry.startTime, THRESHOLDS.FCP),
      };
    }

    // LCP
    if (lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1] as any;
      const lcpValue = lastLcp.renderTime || lastLcp.loadTime || 0;
      report.lcp = {
        name: 'LCP',
        value: lcpValue,
        rating: getRating(lcpValue, THRESHOLDS.LCP),
      };
    }
  } catch (e) {
    console.warn('Failed to get performance metrics:', e);
  }

  return report;
}

/**
 * Optimize images for better LCP
 */
export function optimizeImage(img: HTMLImageElement): void {
  // Add loading="lazy" if not already present
  if (!img.hasAttribute('loading')) {
    img.loading = 'lazy';
  }

  // Add fetchpriority="high" for LCP images
  if (!img.hasAttribute('fetchpriority')) {
    img.fetchPriority = 'high';
  }

  // Ensure proper sizing to prevent layout shift
  if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    };
  }
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string, crossorigin?: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (crossorigin) {
    link.crossOrigin = crossorigin;
  }
  document.head.appendChild(link);
}

/**
 * Defer non-critical JavaScript
 */
export function deferScript(src: string): void {
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
}
