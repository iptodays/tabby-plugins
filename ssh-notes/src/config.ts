import { ConfigProvider } from 'tabby-core'
import { CURRENT_SCHEMA_VERSION, createDefaultSettings } from './models'

export class SSHNotesConfigProvider extends ConfigProvider {
  defaults = {
    sshNotes: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      notes: {},
      settings: createDefaultSettings(),
      backup: null,
    },
  }
}
