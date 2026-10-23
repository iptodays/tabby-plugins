import { Injectable } from '@angular/core'
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import { Profile, PartialProfile } from 'tabby-core'
import { SSHNote } from '../models'
import { NoteEditorModalComponent } from '../components/note-editor-modal.component'

@Injectable({ providedIn: 'root' })
export class NoteEditorService {
  constructor (private ngbModal: NgbModal) {}

  async open (
    profileId: string,
    profile: PartialProfile<Profile> | null,
    note: SSHNote | null,
  ): Promise<SSHNote | null | undefined> {
    let modalRef: NgbModalRef
    modalRef = this.ngbModal.open(NoteEditorModalComponent, {
      size: 'lg',
      keyboard: true,
      backdrop: true,
      beforeDismiss: () => modalRef?.componentInstance?.confirmClose() ?? true,
    })
    modalRef.componentInstance.profileId = profileId
    modalRef.componentInstance.profile = profile
    modalRef.componentInstance.note = note
    try {
      return await modalRef.result
    } catch {
      return undefined
    }
  }
}
