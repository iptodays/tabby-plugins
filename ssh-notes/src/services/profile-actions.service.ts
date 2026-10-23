import { Injectable } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import {
  ConfigService,
  PartialProfile,
  Profile,
  ProfilesService,
} from 'tabby-core'

@Injectable({ providedIn: 'root' })
export class ProfileActionsService {
  constructor (
    private profilesService: ProfilesService,
    private config: ConfigService,
    private ngbModal: NgbModal,
  ) {}

  isSSH (profile: PartialProfile<Profile> | null | undefined): profile is PartialProfile<Profile> & { id: string } {
    return !!profile && profile.type === 'ssh' && !!profile.id && !profile.isTemplate
  }

  getHost (profile: PartialProfile<Profile> | null | undefined): string {
    return profile?.options?.host ?? ''
  }

  getUser (profile: PartialProfile<Profile> | null | undefined): string {
    return profile?.options?.user ?? ''
  }

  getPort (profile: PartialProfile<Profile> | null | undefined): string {
    const port = profile?.options?.port
    return port === undefined || port === null ? '' : String(port)
  }

  getGroupName (profile: PartialProfile<Profile> | null | undefined): string {
    if (!profile?.group) {
      return ''
    }
    return this.profilesService.resolveProfileGroupName(profile.group) || ''
  }

  getConnectionSummary (profile: PartialProfile<Profile> | null | undefined): string {
    if (!profile) {
      return ''
    }
    const user = this.getUser(profile)
    const host = this.getHost(profile)
    const port = this.getPort(profile)
    const address = user ? `${user}@${host}` : host
    return port && port !== '22' ? `${address}:${port}` : address
  }

  async getSSHProfiles (): Promise<Array<PartialProfile<Profile> & { id: string }>> {
    const profiles = await this.profilesService.getProfiles({ includeBuiltin: true })
    const result: Array<PartialProfile<Profile> & { id: string }> = []
    for (const profile of profiles) {
      if (this.isSSH(profile)) {
        result.push(profile)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  async findProfile (profileId: string): Promise<PartialProfile<Profile> | null> {
    const profiles = await this.getSSHProfiles()
    return profiles.find(profile => profile.id === profileId) ?? null
  }

  async connect (profile: PartialProfile<Profile>): Promise<void> {
    if (!this.isSSH(profile)) {
      throw new Error('该连接不是可用的 SSH Profile。')
    }
    await this.profilesService.launchProfile(profile)
  }

  async openNativeProfileSettings (profile: PartialProfile<Profile>): Promise<boolean> {
    if (!this.isSSH(profile)) {
      return false
    }
    const provider = this.profilesService.providerForProfile(profile)
    if (!provider) {
      throw new Error('找不到 SSH Profile Provider，无法打开原生配置。')
    }
    const settingsModule = (window as any).nodeRequire?.('tabby-settings')
    const component = settingsModule?.EditProfileModalComponent
    if (!component) {
      throw new Error('当前 Tabby 版本没有导出 EditProfileModalComponent，无法打开原生配置。')
    }

    const modal = this.ngbModal.open(component, { size: 'lg' })
    modal.componentInstance.partialProfile = JSON.parse(JSON.stringify(profile))
    modal.componentInstance.profileProvider = provider
    const result = await modal.result.catch(() => null)
    if (!result) {
      return false
    }
    result.type = provider.id
    await this.profilesService.writeProfile(result)
    await this.config.save()
    return true
  }
}
