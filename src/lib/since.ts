import { CliError } from '../errors';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, monthIndex, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function parseSinceInput(input: string, now: Date): Date {
  const value = input.trim();
  const normalized = value.toLowerCase();

  if (!value) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Invalid --since value. Use an ISO timestamp, YYYY-MM-DD, today, or yesterday.',
      4
    );
  }

  if (normalized === 'today') {
    return startOfLocalDay(now);
  }

  if (normalized === 'yesterday' || normalized === 'yesterdat') {
    const date = startOfLocalDay(now);
    date.setDate(date.getDate() - 1);
    return date;
  }

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Invalid --since value. Use an ISO timestamp, YYYY-MM-DD, today, or yesterday.',
      4,
      {
        since: input
      }
    );
  }

  return parsed;
}
