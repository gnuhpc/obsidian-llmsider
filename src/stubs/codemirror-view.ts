export class EditorView {
  static updateListener = {
    of: (value: any) => value,
  };

  static decorations = {
    from: (...args: any[]) => args[0],
  };

  static scrollIntoView(pos: number, options?: any): any {
    return { pos, options };
  }

  [key: string]: any;
}

export class Decoration {
  static none: any = [];

  static mark(spec?: any): any {
    return spec;
  }

  static widget(spec?: any): any {
    return spec;
  }

  static set(ranges?: any, _sort?: boolean): any {
    return ranges;
  }
}

export type DecorationSet = any;

export class WidgetType {
  [key: string]: any;
}

export type ViewUpdate = any;

export const ViewPlugin: any = {
  fromClass: (...args: any[]) => args[0],
};

export const keymap: any = {
  of: (value: any) => value,
};
