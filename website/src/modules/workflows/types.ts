/**
 * Types specific to the workflows module
 */

export interface WorkflowFilter {
  active?: boolean;
  tags?: string[];
  search?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry' | 'integrated';
  startedAt: string;
  stoppedAt?: string;
  workflowData: {
    name: string;
    id: string;
  };
  status: 'running' | 'success' | 'error' | 'waiting';
}

export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: string;
}