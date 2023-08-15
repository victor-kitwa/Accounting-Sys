import { Doc } from 'fyo/model/doc';
import { ReadOnlyMap, ValidationMap } from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';

const invalidNumberSeries = /[/\=\?\&\%]/;

function getPaddedName(prefix: string, next: number, padZeros: number): string {
  return prefix + next.toString().padStart(padZeros ?? 4, '0');
}

export default class NumberSeries extends Doc {
  validations: ValidationMap = {
    name: (value) => {
      if (typeof value !== 'string') {
        return;
      }

      if (invalidNumberSeries.test(value)) {
        throw new ValidationError(
          this.fyo
            .t`The following characters cannot be used ${'/, ?, &, =, %'} in a Number Series name.`
        );
      }
    },
  };

  setCurrent() {
    let current = this.get('current') as number | null;

    /**
     * Increment current if it isn't the first entry. This
     * is to prevent reassignment of NumberSeries document ids.
     */

    if (!current) {
      current = this.get('start') as number;
    } else {
      current = current + 1;
    }

    this.current = current;
  }

  async next(schemaName: string) {
    this.setCurrent();
    const exists = await this.checkIfCurrentExists(schemaName);

    if (exists) {
      this.current = (this.current as number) + 1;
    }

    await this.sync();
    return this.getPaddedName(this.current as number);
  }

  async checkIfCurrentExists(schemaName: string) {
    if (!schemaName) {
      return true;
    }

    const name = this.getPaddedName(this.current as number);
    return await this.fyo.db.exists(schemaName, name);
  }

  getPaddedName(next: number): string {
    return getPaddedName(this.name as string, next, this.padZeros as number);
  }

  readOnly: ReadOnlyMap = {
    referenceType: () => this.inserted,
    padZeros: () => this.inserted,
    start: () => this.inserted,
  };
}
