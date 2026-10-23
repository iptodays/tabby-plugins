import { TextDecoder, TextEncoder } from 'util'

if (!(global as any).TextEncoder) {
  ;(global as any).TextEncoder = TextEncoder
}
if (!(global as any).TextDecoder) {
  ;(global as any).TextDecoder = TextDecoder
}
