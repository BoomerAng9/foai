import { AsciiPrototypeSchema, type AsciiPrototype } from "./ascii-prototype-contract";

export class PrototypeStore {
  private readonly prototypes: AsciiPrototype[] = [];

  create(prototype: AsciiPrototype): AsciiPrototype {
    const valid = AsciiPrototypeSchema.parse(prototype);
    this.prototypes.push(valid);
    return valid;
  }

  listByTask(taskId: string): AsciiPrototype[] {
    return this.prototypes.filter((p) => p.taskId === taskId);
  }
}
