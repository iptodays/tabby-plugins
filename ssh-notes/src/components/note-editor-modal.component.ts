import { Component, Input, ViewChild } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { Profile, PartialProfile } from 'tabby-core'
import { SSHNote } from '../models'
import { NoteFormComponent } from './note-form.component'
import { ProfileActionsService } from '../services/profile-actions.service'
import { SSH_NOTES_STYLES } from '../ui/styles'

@Component({
  selector: 'ssh-note-editor-modal',
  styles: [SSH_NOTES_STYLES],
  template: `
    <div class="modal-header">
      <h3 class="m-0">
        SSH 备注
        <span class="text-muted" *ngIf="profile"> · {{ profile.name }}</span>
      </h3>
      <button type="button" class="btn-close" aria-label="关闭" (click)="requestClose()"></button>
    </div>
    <div class="modal-body">
      <ssh-note-form
        [profileId]="profileId"
        [profile]="profile"
        [note]="note"
        (saved)="onSaved($event)"
        (cancelled)="onCancelled()"
        (openProfile)="openNativeProfile()"
      ></ssh-note-form>
    </div>
  `,
})
export class NoteEditorModalComponent {
  @Input() profileId = ''
  @Input() profile: PartialProfile<Profile> | null = null
  @Input() note: SSHNote | null = null

  @ViewChild(NoteFormComponent) form?: NoteFormComponent

  private bypassDismissCheck = false

  constructor (
    public modal: NgbActiveModal,
    private profileActions: ProfileActionsService,
  ) {}

  async confirmClose (): Promise<boolean> {
    if (this.bypassDismissCheck) {
      return true
    }
    return this.form?.canDeactivate() ?? true
  }

  async requestClose (): Promise<void> {
    if (await this.confirmClose()) {
      this.bypassDismissCheck = true
      this.modal.dismiss()
    }
  }

  onSaved (note: SSHNote | null): void {
    this.bypassDismissCheck = true
    this.modal.close(note)
  }

  onCancelled (): void {
    this.bypassDismissCheck = true
    this.modal.dismiss()
  }

  async openNativeProfile (): Promise<void> {
    if (!this.profile) {
      return
    }
    await this.profileActions.openNativeProfileSettings(this.profile)
  }
}
