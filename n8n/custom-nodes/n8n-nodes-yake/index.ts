import { INodeType } from "n8n-workflow";
import { yakeKeywordExtraction } from "./nodes/yakeKeywordExtraction/yakeKeywordExtraction.node";

export const nodeTypes: INodeType[] = [
  new yakeKeywordExtraction(),
];
