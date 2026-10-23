import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import TabbyCoreModule, {
  AppService,
  ConfigProvider,
  ConfigService,
  ProfilesService,
  TabContextMenuItemProvider,
  ToolbarButtonProvider,
} from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { TerminalDecorator } from 'tabby-terminal'

import { SSHNotesConfigProvider } from './config'
import { SSHNotesService } from './services/ssh-notes.service'
import { ProfileActionsService } from './services/profile-actions.service'
import { NoteEditorService } from './services/note-editor.service'
import { SSHNotesTerminalDecorator } from './decorators/terminal-title.decorator'
import { NotesPanelComponent } from './components/notes-panel.component'
import { NotesTabComponent } from './components/notes-tab.component'
import { NoteFormComponent } from './components/note-form.component'
import { NoteEditorModalComponent } from './components/note-editor-modal.component'
import { SSHNotesSettingsTabComponent } from './components/notes-settings-tab.component'
import { SSHNotesSettingsTabProvider } from './providers/settings-tab.provider'
import { SSHNotesToolbarButtonProvider } from './providers/toolbar.provider'
import { SSHNotesContextMenuProvider } from './providers/context-menu.provider'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TabbyCoreModule,
  ],
  providers: [
    { provide: ConfigProvider, useClass: SSHNotesConfigProvider, multi: true },
    { provide: SettingsTabProvider, useClass: SSHNotesSettingsTabProvider, multi: true },
    { provide: ToolbarButtonProvider, useClass: SSHNotesToolbarButtonProvider, multi: true },
    { provide: TabContextMenuItemProvider, useClass: SSHNotesContextMenuProvider, multi: true },
    { provide: TerminalDecorator, useClass: SSHNotesTerminalDecorator, multi: true },
    SSHNotesService,
    ProfileActionsService,
    NoteEditorService,
  ],
  declarations: [
    NotesPanelComponent,
    NotesTabComponent,
    NoteFormComponent,
    NoteEditorModalComponent,
    SSHNotesSettingsTabComponent,
  ],
})
export default class TabbySSHNotesModule {
  constructor (notes: SSHNotesService, config: ConfigService, app: AppService, profiles: ProfilesService) {
    console.info('Tabby SSH Notes loaded')
    if (process.env.TABBY_SSH_NOTES_DEBUG === '1') {
      (window as any).sshNotesDebug = { notes, config, app, profiles }
    }
  }
}
