/**
 * DOM utility functions
 */

/**
 * Query selector with type safety
 */
export function querySelector<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Query selector all with type safety
 */
export function querySelectorAll<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): NodeListOf<T> {
  return parent.querySelectorAll<T>(selector);
}

/**
 * Create element with attributes
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

/**
 * Add event listener with automatic cleanup
 */
export function addEventListenerWithCleanup<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | Window | Document,
  event: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(event as string, handler as EventListener, options);
  
  return () => {
    element.removeEventListener(event as string, handler as EventListener, options);
  };
}

/**
 * Wait for element to appear in DOM
 */
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Toggle class with optional force parameter
 */
export function toggleClass(
  element: HTMLElement,
  className: string,
  force?: boolean
): boolean {
  if (force !== undefined) {
    if (force) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
    return force;
  }
  
  return element.classList.toggle(className);
}

/**
 * Get closest parent element matching selector
 */
export function closest<T extends HTMLElement>(
  element: HTMLElement,
  selector: string
): T | null {
  return element.closest<T>(selector);
}

/**
 * Check if element matches selector
 */
export function matches(element: HTMLElement, selector: string): boolean {
  return element.matches(selector);
}

/**
 * Insert HTML safely (sanitizes input)
 */
export function insertHTML(
  element: HTMLElement,
  html: string,
  position: InsertPosition = 'beforeend'
): void {
  // Basic sanitization - in production, use a proper sanitization library
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  element.insertAdjacentHTML(position, sanitized);
}