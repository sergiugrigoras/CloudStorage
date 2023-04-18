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
    }
}