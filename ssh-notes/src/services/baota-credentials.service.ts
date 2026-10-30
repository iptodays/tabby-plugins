import { Injectable } from '@angular/core'
import { VaultService } from 'tabby-core'

const SECRET_TYPE = 'ssh-notes-baota'

export type BaotaPasswordStorage = 'vault' | 'memory' | 'none'

/**
 * Stores BaoTa panel passwords outside the Tabby config file.
 * Uses the Tabby vault when it is enabled, otherwise keeps the password in
 * memory for the current Tabby session only.
 */
@Injectable({ providedIn: 'root' })
export class BaotaCredentialsService {
  private memory = new Map<string, string>()

  constructor (private vault: VaultService) {}

  isEncryptionEnabled (): boolean {
    return this.vault.isEnabled()
  }

  hasInMemoryPassword (profileId: string): boolean {
    return this.memory.has(profileId)
  }

  async getPassword (profileId: string): Promise<string | null> {
    if (!profileId) {
      return null
    }
    if (this.vault.isEnabled()) {
      const secret = await this.vault.getSecret(SECRET_TYPE, { id: profileId })
      if (secret?.value) {
        return secret.value
      }
    }
    return this.memory.get(profileId) ?? null
  }

  async savePassword (profileId: string, password: string): Promise<BaotaPasswordStorage> {
    if (!profileId) {
      throw new Error('缺少 SSH Profile ID，无法保存宝塔密码。')
    }
    if (!password) {
      await this.deletePassword(profileId)
      return 'none'
    }
    if (this.vault.isEnabled()) {
      await this.vault.addSecret({
        type: SECRET_TYPE,
        key: { id: profileId },
        value: password,
      })
      this.memory.delete(profileId)
      return 'vault'
    }
    this.memory.set(profileId, password)
    return 'memory'
  }

  async deletePassword (profileId: string): Promise<void> {
    if (!profileId) {
      return
    }
    this.memory.delete(profileId)
    if (this.vault.isEnabled()) {
      await this.vault.removeSecret(SECRET_TYPE, { id: profileId })
    }
  }
}
