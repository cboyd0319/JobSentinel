import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

type VitalsCallback = (metric: Metric) => void;

/**
 * Report Web Vitals metrics
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Loading performance
 * - INP (Interaction to Next Paint): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 *
 * Other metrics:
 * - FCP (First Contentful Paint): Initial render time
 * - TTFB (Time to First Byte): Server response time
 */
export function reportWebVitals(onReport?: VitalsCallback) {
  const callback = onReport || logMetric;

  onCLS(callback);
  onFCP(callback);
  onINP(callback);
  onLCP(callback);
  onTTFB(callback);
}

/**
 * Default metric logger - logs to console in dev mode
 */
function logMetric(metric: Metric) {
  // Only log in development mode
  if (import.meta.env.DEV) {
    const rating = getMetricRating(metric);
    console.log(
      `[Web Vitals] ${metric.name}: ${Math.round(metric.value)}${getMetricUnit(metric.name)} (${rating})`
    );
  }

  // In production, you could send to analytics service
  // Example: sendToAnalytics(metric)
}

/**
 * Get human-readable rating for a metric
 */
function getMetricRating(metric: Metric): string {
  const { name, rating } = metric;

  if (rating === "good") return "✅ Good";
  if (rating === "needs-improvement") return "⚠️ Needs Improvement";
  if (rating === "poor") return "❌ Poor";

  // Fallback based on thresholds
  const thresholds: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    INP: { good: 200, poor: 500 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "Unknown";

  if (metric.value <= threshold.good) return "✅ Good";
  if (metric.value <= threshold.poor) return "⚠️ Needs Improvement";
  return "❌ Poor";
}

/**
 * Get unit for metric display
 */
function getMetricUnit(name: string): string {
  if (name === "CLS") return ""; // Unitless
  return "ms";
}

/**
 * Performance summary for debugging
 */
export function getPerformanceSummary(): Record<string, number> {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

  return {
    // Navigation timing
    domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
    loadComplete: navigation?.loadEventEnd || 0,
    domInteractive: navigation?.domInteractive || 0,

    // Resource count
    resourceCount: performance.getEntriesByType("resource").length,

    // Memory (if available)
    // @ts-expect-error - memory is non-standard
    jsHeapSize: performance.memory?.usedJSHeapSize || 0,
  };
}
