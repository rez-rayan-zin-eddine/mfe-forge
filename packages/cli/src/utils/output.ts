export interface OutputOptions { json?: boolean; quiet?: boolean }
export function output(value: unknown, options: OutputOptions, human: () => void): void {
  if (options.quiet) return
  if (options.json) console.log(JSON.stringify(value, null, 2))
  else human()
}
