import { Subject } from 'rxjs'

export function Injectable (..._args: any[]): any {
  return (target: any) => target
}

export function Component (..._args: any[]): any {
  return (target: any) => target
}

export function Input (): any {
  return (_target: any, _key: string) => undefined
}

export function Output (): any {
  return (_target: any, _key: string) => undefined
}

export function ViewChild (..._args: any[]): any {
  return (_target: any, _key: string) => undefined
}

export function Inject (..._args: any[]): any {
  return (_target: any, _key: string) => undefined
}

export function Optional (): any {
  return (_target: any, _key: string) => undefined
}

export function HostBinding (..._args: any[]): any {
  return (_target: any, _key: string) => undefined
}

export function HostListener (..._args: any[]): any {
  return (_target: any, _key: string) => undefined
}

export class EventEmitter<T = any> extends Subject<T> {
  emit (value: T): void {
    this.next(value)
  }
}

export class Injector {
  get (_token: any): any {
    return undefined
  }
}

export class NgZone {}

export class ElementRef {}

export class ViewContainerRef {}

export class EmbeddedViewRef {}

export class ComponentFactoryResolver {}

export class ApplicationRef {}
