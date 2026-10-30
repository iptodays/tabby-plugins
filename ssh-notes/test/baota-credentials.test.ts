import { BaotaCredentialsService } from '../src/services/baota-credentials.service'

function makeService (vaultEnabled: boolean) {
  const secrets = new Map<string, string>()
  const vault = {
    isEnabled: jest.fn(() => vaultEnabled),
    getSecret: jest.fn(async (_type: string, key: any) => {
      const value = secrets.get(key.id)
      return value === undefined ? null : { type: 'ssh-notes-baota', key, value }
    }),
    addSecret: jest.fn(async (secret: any) => {
      secrets.set(secret.key.id, secret.value)
    }),
    removeSecret: jest.fn(async (_type: string, key: any) => {
      secrets.delete(key.id)
    }),
  }
  return {
    service: new BaotaCredentialsService(vault as any),
    vault,
    secrets,
  }
}

describe('BaotaCredentialsService', () => {
  test('uses the vault when encryption is enabled', async () => {
    const { service, vault, secrets } = makeService(true)

    expect(await service.savePassword('ssh:custom:a:1', 'p@ss word')).toBe('vault')
    expect(vault.addSecret).toHaveBeenCalledTimes(1)
    expect(secrets.get('ssh:custom:a:1')).toBe('p@ss word')
    expect(service.hasInMemoryPassword('ssh:custom:a:1')).toBe(false)
    expect(await service.getPassword('ssh:custom:a:1')).toBe('p@ss word')

    await service.deletePassword('ssh:custom:a:1')
    expect(vault.removeSecret).toHaveBeenCalledTimes(1)
    expect(await service.getPassword('ssh:custom:a:1')).toBeNull()
  })

  test('keeps the password in memory when encryption is disabled', async () => {
    const { service, vault } = makeService(false)

    expect(await service.savePassword('ssh:custom:a:1', 'secret')).toBe('memory')
    expect(vault.addSecret).not.toHaveBeenCalled()
    expect(service.hasInMemoryPassword('ssh:custom:a:1')).toBe(true)
    expect(await service.getPassword('ssh:custom:a:1')).toBe('secret')

    await service.deletePassword('ssh:custom:a:1')
    expect(service.hasInMemoryPassword('ssh:custom:a:1')).toBe(false)
    expect(await service.getPassword('ssh:custom:a:1')).toBeNull()
  })

  test('deletes the stored password when saving an empty value', async () => {
    const { service } = makeService(false)
    await service.savePassword('ssh:custom:a:1', 'secret')

    expect(await service.savePassword('ssh:custom:a:1', '')).toBe('none')
    expect(await service.getPassword('ssh:custom:a:1')).toBeNull()
  })
})
