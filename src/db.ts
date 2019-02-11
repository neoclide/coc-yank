import path from 'path'
import { statAsync, writeFile, readFile } from './util'
import uuid = require('uuid/v1')


export interface HistoryItem {
  id: string
  content: string[]
  regtype: string
  path: string
}

export default class DB {
  private file: string

  constructor(directory: string) {
    this.file = path.join(directory, 'yank.json')
  }

  public async load(): Promise<HistoryItem[]> {
    let stat = await statAsync(this.file)
    if (!stat || !stat.isFile()) return []
    let content = await readFile(this.file)
    return JSON.parse(content) as HistoryItem[]
  }

  public async add(content: string[], regtype: string, path: string): Promise<void> {
    let items = await this.load()
    items.unshift({ id: uuid(), content, regtype, path })
    await writeFile(this.file, JSON.stringify(items, null, 2))
  }

  public async delete(uid: string): Promise<void> {
    let items = await this.load()
    let idx = items.findIndex(o => o.id == uid)
    if (idx !== -1) {
      items.splice(idx, 1)
      await writeFile(this.file, JSON.stringify(items))
    }
  }
}
