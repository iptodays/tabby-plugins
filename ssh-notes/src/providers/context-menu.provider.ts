import { Injectable } from '@angular/core'
import { AppService, BaseTabComponent, MenuItemOptions, TabContextMenuItemProvider } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { NotesTabComponent } from '../components/notes-tab.component'
import { NoteEditorService } from '../services/note-editor.service'
import { SSHNotesService } from '../services/ssh-notes.service'

@Injectable()
export class SSHNotesContextMenuProvider extends TabContextMenuItemProvider {
  weight = 50

  constructor (
    private app: AppService,
    private notes: SSHNotesService,
    private noteEditor: NoteEditorService,
  ) {
    super()
  }

  async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
    const items: MenuItemOptions[] = [{
      label: '打开 SSH Notes 面板',
      click: () => {
        const existing = this.app.tabs.find(item => item instanceof NotesTabComponent)
        if (existing) {
          this.app.selectTab(existing)
          return
        }
        this.app.openNewTabRaw({ type: NotesTabComponent })
      },
    }]

    if (!(tab instanceof BaseTerminalTabComponent)) {
      return items
    }
    const profile = tab.profile
    if (profile?.type !== 'ssh' || !profile.id) {
      return items
    }

    await this.notes.ready()
    items.unshift({
      label: '编辑此连接的 SSH 备注…',
      commandLabel: '编辑 SSH 备注',
      click: () => {
        const note = this.notes.getNote(profile.id)
        this.noteEditor.open(profile.id, profile, note).catch(error => {
          console.error('SSH Notes: could not open note editor', error)
        })
      },
    })
    return items
  }
}
