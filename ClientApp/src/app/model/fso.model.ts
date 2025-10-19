export interface IFsoModel {
  id: number;
  name: string;
  parentId: number | null;
  isFolder: boolean;
  fileName?: string;
  fileSize?: number;
  date: string | Date;
  ownerId: string;
  children?: IFsoModel[];
}

export class FsoModel {
  id: number;
  name: string;
  parentId: number | null;
  isFolder: boolean;
  fileName: string;
  fileSize: number;
  date: Date;
  ownerId: string;
  children: FsoModel[];
  isSelected = false;
  isCut = false;

  constructor(fso: IFsoModel) {
    this.id = fso.id;
    this.name = fso.name;
    this.parentId = fso.parentId;
    this.isFolder = fso.isFolder;
    this.fileName = fso.fileName ?? '';
    this.fileSize = fso.fileSize ?? 0;
    this.date = fso.date instanceof Date ? fso.date : new Date(fso.date);
    this.ownerId = fso.ownerId;
    this.children = Array.isArray(fso.children)
      ? fso.children.map((child) => new FsoModel(child))
      : [];
  }

  static getFileExtension(fso: FsoModel): string {
    if (fso.isFolder) return '';
    const lastDotIndex = fso.name.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fso.name.length - 1) {
      return '';
    }
    return fso.name.slice(lastDotIndex + 1).toUpperCase();
  }
}

export interface FsoMoveResultModel {
  success: FsoModel[];
  fail: FsoModel[];
}

export class FsoTouchHelper {
  private readonly time: Record<number, number>;
  private readonly threshold: number;
  constructor(threshold: number) {
    this.threshold = threshold;
    this.time = {};
  }
  public touch(id: number): boolean {
    const now = Date.now();
    const value = this.time[id] ?? 0;
    this.time[id] = now;
    return this.inThresholdRange(now - value);
  }

  private inThresholdRange(value: number) {
    return value <= this.threshold;
  }
}
