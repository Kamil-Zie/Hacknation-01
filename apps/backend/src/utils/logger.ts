// T-001 Minimal logger (the only place allowed to use console)
/* eslint-disable no-console */
function format(level: string, message: string): string {
  return `${new Date().toISOString()} [${level}] ${message}`;
}

export const logger = {
  info: (message: string) => console.log(format('info', message)),
  warn: (message: string) => console.warn(format('warn', message)),
  error: (message: string) => console.error(format('error', message)),
};
