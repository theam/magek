export * from './parsing.ts'
export * from './types.ts'

export interface Target<TInfo> {
  name: string
  extension: string
  placementDir: string
  template: string
  info: TInfo
}

export type FileDir<TInfo> = Pick<Target<TInfo>, 'placementDir' | 'name' | 'extension'>
