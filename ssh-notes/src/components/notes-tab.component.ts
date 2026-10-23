import { Component, Injector } from '@angular/core'
import { BaseTabComponent } from 'tabby-core'
import { SSH_NOTES_STYLES } from '../ui/styles'

@Component({
  selector: 'ssh-notes-tab',
  styles: [SSH_NOTES_STYLES],
  template: `
    <ssh-notes-panel></ssh-notes-panel>
  `,
})
export class NotesTabComponent extends BaseTabComponent {
  constructor (injector: Injector) {
    super(injector)
    this.title = 'SSH Notes'
    this.icon = 'fas fa-note-sticky'
  }
}
