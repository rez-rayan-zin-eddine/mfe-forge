/** Process exit codes used by every CLI command. */
export const ExitCode = {
  Ok: 0,
  /** Invalid input: unknown app, bad flag combination, missing argument. */
  UserError: 1,
  /** A delegated task (build, test, dev server) failed. */
  TaskFailed: 2,
  /** The project configuration could not be loaded or is invalid. */
  ConfigError: 3,
} as const

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode]

/** An error that carries the exit code the CLI should terminate with. */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCodeValue = ExitCode.UserError
  ) {
    super(message)
    this.name = 'CliError'
  }
}
