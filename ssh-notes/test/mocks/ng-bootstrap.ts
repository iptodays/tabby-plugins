export class NgbModal {
  open (): any {
    return {
      componentInstance: {},
      result: Promise.resolve(null),
    }
  }
}

export class NgbModalRef {}

export class NgbActiveModal {
  close (): void {}
  dismiss (): void {}
}
