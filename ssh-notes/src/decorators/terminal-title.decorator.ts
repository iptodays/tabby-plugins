import { Injectable } from '@angular/core'
import { Subscription } from 'rxjs'
import { BaseTerminalTabComponent, TerminalDecorator } from 'tabby-terminal'
import { SSHNotesService } from '../services/ssh-notes.service'
import { formatTerminalTitle } from '../title'

interface TerminalTitleState {
  originalDisableDynamicTitle: boolean
  lastDynamicTitle: string
  appliedTitle: string
  applied: boolean
  titleSubscription: Subscription | null
}

@Injectable()
export class SSHNotesTerminalDecorator extends TerminalDecorator {
  private states = new Map<BaseTerminalTabComponent<any>, TerminalTitleState>()

  constructor (private notes: SSHNotesService) {
    super()
  }

  attach (terminal: BaseTerminalTabComponent<any>): void {
    const profile = terminal.profile
    if (profile?.type !== 'ssh' || !profile.id) {
      return
    }

    const state: TerminalTitleState = {
      originalDisableDynamicTitle: terminal.disableDynamicTitle,
      lastDynamicTitle: terminal.title || profile.name || '',
      appliedTitle: '',
      applied: false,
      titleSubscription: null,
    }
    this.states.set(terminal, state)

    const subscribeToFrontend = () => {
      if (!terminal.frontend || state.titleSubscription) {
        return
      }
      state.titleSubscription = terminal.frontend.title$.subscribe(title => {
        if (title) {
          state.lastDynamicTitle = title
        }
      })
      this.subscribeUntilDetached(terminal, state.titleSubscription)
    }

    subscribeToFrontend()
    if (!state.titleSubscription) {
      this.subscribeUntilDetached(terminal, terminal.frontendReady$.subscribe(() => {
        subscribeToFrontend()
        this.apply(terminal)
      }))
    }

    this.subscribeUntilDetached(terminal, this.notes.changed$.subscribe(() => this.apply(terminal)))
    this.notes.ready()
      .then(() => this.apply(terminal))
      .catch(error => console.warn('SSH Notes: could not load notes for terminal title', error))
  }

  detach (terminal: BaseTerminalTabComponent<any>): void {
    const state = this.states.get(terminal)
    if (state?.applied) {
      terminal.disableDynamicTitle = state.originalDisableDynamicTitle
    }
    this.states.delete(terminal)
    super.detach(terminal)
  }

  private apply (terminal: BaseTerminalTabComponent<any>): void {
    const state = this.states.get(terminal)
    const profile = terminal.profile
    if (!state || !profile || profile.type !== 'ssh' || !profile.id) {
      return
    }

    const note = this.notes.getNote(profile.id)
    const settings = this.notes.getSettings()
    let desiredTitle = formatTerminalTitle(note, settings)

    if (!desiredTitle && note && settings.enabled && settings.emptyTitleBehavior === 'profile-name') {
      desiredTitle = profile.name || ''
    }

    if (desiredTitle) {
      terminal.disableDynamicTitle = true
      if (state.appliedTitle !== desiredTitle) {
        terminal.setTitle(desiredTitle)
        state.appliedTitle = desiredTitle
      }
      state.applied = true
      return
    }

    if (state.applied) {
      terminal.disableDynamicTitle = state.originalDisableDynamicTitle
      const restoreTitle = state.originalDisableDynamicTitle
        ? (profile.name || terminal.title)
        : (state.lastDynamicTitle || profile.name || terminal.title)
      terminal.setTitle(restoreTitle)
      state.applied = false
      state.appliedTitle = ''
    }
  }
}
