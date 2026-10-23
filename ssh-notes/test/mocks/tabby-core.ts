export class ConfigProvider {
  defaults: any = {}
  platformDefaults: any = {}
}

export class ConfigService {}

export class PlatformService {}

export class NotificationsService {
  notice = jest.fn()
  info = jest.fn()
  error = jest.fn()
}

export class LogService {
  create = () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })
}

export class Logger {}

export class FileUpload {}

export class Profile {}
export class PartialProfile {}

export class ProfilesService {}

export class AppService {}

export class ToolbarButtonProvider {}

export class TabContextMenuItemProvider {}

export class BaseComponent {
  protected subscribeUntilDestroyed (): void {}
  ngOnDestroy (): void {}
}

export class BaseTabComponent extends BaseComponent {
  title = ''
  icon: string | null = null
  constructor (_injector?: any) {
    super()
  }
}

export class SettingsTabProvider {}

export class TerminalDecorator {}
