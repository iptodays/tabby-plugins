import { Injectable } from '@angular/core'
import { AppService, ToolbarButton, ToolbarButtonProvider } from 'tabby-core'
import { NotesTabComponent } from '../components/notes-tab.component'

const NOTES_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h7"/><path d="M9 16h7"/></svg>'

@Injectable()
export class SSHNotesToolbarButtonProvider extends ToolbarButtonProvider {
  constructor (private app: AppService) {
    super()
  }

  provide (): ToolbarButton[] {
    return [
      {
        icon: NOTES_ICON,
        title: 'SSH Notes',
        weight: 40,
        click: () => {
          const existing = this.app.tabs.find(tab => tab instanceof NotesTabComponent)
          if (existing) {
            this.app.selectTab(existing)
            return
          }
          this.app.openNewTabRaw({ type: NotesTabComponent })
        },
      },
    ]
  }
}
