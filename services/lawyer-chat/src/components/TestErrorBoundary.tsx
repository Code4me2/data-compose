'use client';

import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function BuggyComponent() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Test error: Component crashed intentionally!');
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Buggy Component</h3>
      <p className="mb-2">Click the button to trigger an error.</p>
      <button
        onClick={() => setShouldCrash(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}

export function TestErrorBoundary() {
  const [key, setKey] = useState(0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Error Boundary Test</h2>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Test 1: Component-level Error Boundary</h3>
        <ErrorBoundary 
          key={key}
          level="component"
          isolate
        >
          <BuggyComponent />
        </ErrorBoundary>
        <button
          onClick={() => setKey(k => k + 1)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Reset Test Component
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Test 2: Async Error</h3>
        <button
          onClick={() => {
            setTimeout(() => {
              throw new Error('Async error after 1 second!');
            }, 1000);
          }}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Trigger Async Error (will be caught by global handler)
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Test 3: Promise Rejection</h3>
        <button
          onClick={() => {
            Promise.reject(new Error('Unhandled promise rejection!'));
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Trigger Promise Rejection
        </button>
      </div>
    </div>
  );
}