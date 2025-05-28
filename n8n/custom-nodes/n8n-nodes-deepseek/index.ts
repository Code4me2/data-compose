import { INodeType } from "n8n-workflow";
import { Dsr1 } from "./nodes/Dsr1/Dsr1.node";

export const nodeTypes: INodeType[] = [
  new Dsr1(),
];
