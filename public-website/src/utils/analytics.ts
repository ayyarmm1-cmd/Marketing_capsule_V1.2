import { analytics } from '../config/firebase';
import { logEvent } from 'firebase/analytics';

/**
 * Log an analytics event
 * @param eventName - Name of the event
 * @param eventParams - Additional parameters for the event
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

/**
 * Track page views
 * @param pagePath - Path of the page
 * @param pageTitle - Title of the page
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
};

/**
 * Track button clicks
 * @param buttonName - Name/identifier of the button
 * @param location - Where the button is located
 */
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location || 'unknown',
  });
};

/**
 * Track form submissions
 * @param formName - Name of the form
 * @param success - Whether the form submission was successful
 */
export const trackFormSubmit = (formName: string, success: boolean = true) => {
  trackEvent('form_submit', {
    form_name: formName,
    success: success,
  });
};

/**
 * Track navigation events
 * @param destination - Where the user is navigating to
 */
export const trackNavigation = (destination: string) => {
  trackEvent('navigation', {
    destination: destination,
  });
};

