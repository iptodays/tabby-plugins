import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { SSHNotesSettingsTabComponent } from '../components/notes-settings-tab.component'

@Injectable()
export class SSHNotesSettingsTabProvider extends SettingsTabProvider {
  id = 'ssh-notes'
  icon = 'note-sticky'
  title = 'SSH Notes'
  weight = 75

  getComponentType (): any {
    return SSHNotesSettingsTabComponent
  }
}
