import { readJsonOrInit, atomicWriteJson } from "../../repos/local/atomic_json.ts";
import type { StaffEvent } from "./events.ts";

const PATH_EVENTS = "./data/staff_events.json";
type EventsFile = { version: 1; events: StaffEvent[] };

export class StaffEventsRepo {
  async append(ev: StaffEvent): Promise<void> {
    const db = await readJsonOrInit<EventsFile>(PATH_EVENTS, { version: 1, events: [] });
    db.events.push(ev);
    await atomicWriteJson(PATH_EVENTS, db);
  }
}
