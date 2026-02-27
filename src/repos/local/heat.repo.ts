import type { HeatRepo } from "../types.ts";
export class LocalHeatRepo implements HeatRepo { async noop(): Promise<void> {} }
