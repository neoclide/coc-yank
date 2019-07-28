import fs from 'fs'
import path from 'path'
import { readFile } from './util'
import uuid = require('uuid/v1')

export interface HistoryItem {
  id: string
  content: string[]
  regtype: string
  path: string
  filetype: string
}

export default class DB {
  private file: string

  constructor(directory: string, private maxsize: number) {
    this.file = path.join(directory, 'yank.json')
  }

  public async load(): Promise<HistoryItem[]> {
    if (!fs.existsSync(this.file)) return []
    try {
      let content = await readFile(this.file)
      return JSON.parse(content) as HistoryItem[]
    } catch (e) {
      return []
    }
  }

  public async add(content: string[], regtype: string, path: string, filetype: string): Promise<void> {
    let items = await this.load()
    if (items.length == this.maxsize) {
      items.pop()
    }
    items.unshift({ id: uuid(), content, regtype, path, filetype })
    fs.writeFileSync(this.file, JSON.stringify(items, null, 2), 'utf8')
  }

  public async delete(uid: string): Promise<void> {
    let items = await this.load()
    let idx = items.findIndex(o => o.id == uid)
    if (idx !== -1) {
      items.splice(idx, 1)
      fs.writeFileSync(this.file, JSON.stringify(items, null, 2), 'utf8')
    }
  }
}
