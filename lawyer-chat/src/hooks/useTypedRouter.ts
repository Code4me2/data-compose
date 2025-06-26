/**
 * Type-safe router hook that handles base path configuration.
 * Provides typed navigation methods that work with any deployment path.
 */

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { buildPath, buildPagePath, pathConfig } from '@/lib/paths';

type PageKey = keyof typeof pathConfig.pages;

export interface TypedRouter {
  push: (path: PageKey | string, options?: NavigateOptions) => Promise<boolean>;
  replace: (path: PageKey | string, options?: NavigateOptions) => Promise<boolean>;
  prefetch: (path: PageKey | string) => Promise<void>;
  back: () => void;
  forward: () => void;
  refresh: () => void;
}

interface NavigateOptions {
  scroll?: boolean;
}

/**
 * Hook that provides type-safe navigation with base path support.
 * 
 * @example
 * const router = useTypedRouter();
 * 
 * // Navigate using page keys (type-safe)
 * router.push('home');
 * router.push('admin');
 * 
 * // Navigate using custom paths
 * router.push('/custom/path');
 * 
 * // Replace history entry
 * router.replace('login');
 */
export function useTypedRouter(): TypedRouter {
  const router = useRouter();

  const resolvePath = useCallback((path: PageKey | string): string => {
    // Check if it's a page key
    if (pathConfig.pages[path as PageKey]) {
      return buildPagePath(path as PageKey);
    }
    // Otherwise treat it as a custom path
    return buildPath(path);
  }, []);

  const push = useCallback(
    async (path: PageKey | string, options?: NavigateOptions) => {
      const finalPath = resolvePath(path);
      router.push(finalPath, options);
      return true;
    },
    [router, resolvePath]
  );

  const replace = useCallback(
    async (path: PageKey | string, options?: NavigateOptions) => {
      const finalPath = resolvePath(path);
      router.replace(finalPath, options);
      return true;
    },
    [router, resolvePath]
  );

  const prefetch = useCallback(
    async (path: PageKey | string) => {
      const finalPath = resolvePath(path);
      router.prefetch(finalPath);
    },
    [router, resolvePath]
  );

  return {
    push,
    replace,
    prefetch,
    back: router.back,
    forward: router.forward,
    refresh: router.refresh,
  };
}

/**
 * Hook for building typed links.
 * Useful for generating href attributes with proper base path.
 * 
 * @example
 * const buildLink = useTypedLink();
 * 
 * <Link href={buildLink('admin')}>Admin Panel</Link>
 * <Link href={buildLink('/custom/path')}>Custom Page</Link>
 */
export function useTypedLink() {
  return useCallback((path: PageKey | string): string => {
    // Check if it's a page key
    if (pathConfig.pages[path as PageKey]) {
      return buildPagePath(path as PageKey);
    }
    // Otherwise treat it as a custom path
    return buildPath(path);
  }, []);
}