import { AnyClass } from '../typelevel.js'

export interface SchemaMigrationMetadata {
  migrationClass: AnyClass
  methodName: string
  toVersion: number
  fromSchema: AnyClass
  toSchema: AnyClass
}
