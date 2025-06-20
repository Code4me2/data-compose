import { INodeType } from "n8n-workflow";
import { HierarchicalSummarization } from "./nodes/HierarchicalSummarization/HierarchicalSummarization.node";

export const nodeTypes: INodeType[] = [
  new HierarchicalSummarization(),
];