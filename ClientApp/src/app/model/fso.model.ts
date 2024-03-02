export class FsoModel {
    id: number;
    name: string;
    parentId: number;
    isFolder: boolean;
    fileName: string;
    fileSize: number;
    date: Date;
    ownerId: string;
    children: FsoModel[];
    isSelected: boolean;
    isCut: boolean;

    constructor(fso: any) {
        this.id = fso.id;
        this.name = fso.name;
        this.parentId = fso.parentId;
        this.isFolder = fso.isFolder;
        this.fileName = fso.fileName;
        this.fileSize = fso.fileSize;
        this.date = new Date(fso.date);
        this.ownerId = fso.ownerId;
        this.children = fso.children?.map((x: any) => new FsoModel(x));
        this.isSelected = false;
        this.isCut = false;
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
