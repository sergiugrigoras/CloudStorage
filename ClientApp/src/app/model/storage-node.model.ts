import { signal } from '@angular/core';

export interface IStorageNodeModel {
  id?: string;
  name: string;
  extension?: string;
  isFolder: boolean;
  parentId?: string | null;
  fileName?: string;
  fileSize?: number;
  date?: string | Date;
  children?: IStorageNodeModel[];
}

export class StorageNode {
  id: string;
  name: string;
  extension: string | null;
  parentId: string | null;
  isFolder: boolean;
  fileSize: number | null;
  date: Date;
  children: StorageNode[];
  isSelected = signal(false);
  isCut = signal(false);
  get fullName() {
    return this.name + (this.extension ?? '');
  }

  get ext() {
    return this.extension ? this.extension.slice(1).toUpperCase() : '';
  }

  constructor(fso: IStorageNodeModel) {
    this.id = fso.id ?? '';
    this.name = fso.name;
    this.extension = fso.extension ?? null;
    this.parentId = fso.parentId ?? null;
    this.isFolder = fso.isFolder;
    this.fileSize = fso.fileSize ?? null;
    this.date = fso.date ? new Date(fso.date) : new Date();
    this.children = Array.isArray(fso.children)
      ? fso.children.map((child) => new StorageNode(child))
      : [];
  }

  toSimpleNode(): ISimpleNode {
    return { id: this.id, parentId: this.parentId, name: this.fullName };
  }
}

export class NodeTouchHelper {
  private readonly time: Record<string, number>;
  private readonly threshold: number;
  constructor(threshold: number) {
    this.threshold = threshold;
    this.time = {};
  }
  public touch(id: string): boolean {
    const now = Date.now();
    const value = this.time[id] ?? 0;
    this.time[id] = now;
    return this.inThresholdRange(now - value);
  }

  private inThresholdRange(value: number) {
    return value <= this.threshold;
  }
}

export interface ISimpleNode {
  id: string | null;
  parentId: string | null;
  name: string;
}

export const ROOT_NODE: ISimpleNode = { id: null, parentId: null, name: 'root' };

class NodeSort {
  public static sortByNameAscFn = (a: StorageNode, b: StorageNode): number => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return a.fullName.localeCompare(b.fullName);
  };

  public static sortByNameDescFn = (a: StorageNode, b: StorageNode): number => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return b.fullName.localeCompare(a.fullName);
  };

  public static sortBySizeAscFn = (a: StorageNode, b: StorageNode) => {
    if (a.isFolder && b.isFolder) {
      return a.fullName.localeCompare(b.fullName);
    }
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return (a.fileSize ?? 0) - (b.fileSize ?? 0);
  };

  public static sortBySizeDescFn = (a: StorageNode, b: StorageNode) => {
    if (a.isFolder && b.isFolder) {
      return a.fullName.localeCompare(b.fullName);
    }
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return (b.fileSize ?? 0) - (a.fileSize ?? 0);
  };

  public static sortByDateAscFn = (a: StorageNode, b: StorageNode) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return a.date.getTime() - b.date.getTime();
  };

  public static sortByDateDescFn = (a: StorageNode, b: StorageNode) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return b.date.getTime() - a.date.getTime();
  };
}

export type CompareFsoFn = (a: StorageNode, b: StorageNode) => number;

export const NODE_SORT_FN = {
  NAME: {
    ASC: NodeSort.sortByNameAscFn as CompareFsoFn,
    DESC: NodeSort.sortByNameDescFn as CompareFsoFn,
  },
  SIZE: {
    ASC: NodeSort.sortBySizeAscFn as CompareFsoFn,
    DESC: NodeSort.sortBySizeDescFn as CompareFsoFn,
  },
  DATE: {
    ASC: NodeSort.sortByDateAscFn as CompareFsoFn,
    DESC: NodeSort.sortByDateDescFn as CompareFsoFn,
  },
};
