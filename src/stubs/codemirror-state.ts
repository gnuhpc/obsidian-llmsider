export type Extension = any;

export interface StateEffectType<T> {
  of(value: T): any;
}

export const StateField = {
  define<T = any>(value: any): T {
    return value as T;
  },
};

export const StateEffect = {
  define<T = unknown>(): StateEffectType<T> {
    return {
      of(value: T): any {
        return value;
      },
    };
  },
};

export class RangeSetBuilder<T = any> {
  add(..._args: any[]): void {}
  finish(): T[] {
    return [];
  }
}

export const Prec: any = {
  highest: (value: any) => value,
};
