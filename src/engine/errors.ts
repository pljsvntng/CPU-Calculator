export class SchedulingValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'SchedulingValidationError' }
}

export class SchedulingLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'SchedulingLimitError' }
}
