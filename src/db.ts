import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { readFile } from './util'

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
    let jsonFile = path.join(directory, 'yank.json')
    this.file = path.join(directory, 'yank')
    this.convertJson(jsonFile)
  }

  private buildItem(content: string[], filepath: string, regtype: string, filetype: string): HistoryItem {
    let id = crypto.createHash('md5').update(content.join('\n')).digest('hex')

    return {
      id,
      content,
      path: filepath,
      filetype,
      regtype,
    }
  }

  private write(rawItems: Array<HistoryItem>): void {
    let lines: string[] = []
    let items = rawItems;

    if (items.length > this.maxsize) {
      items = items.slice(items.length - this.maxsize);
    }

    for (let item of items) {
      let [filepath, lnum, col] = item.path.split('\t')
      let line = `${item.id}|${filepath}|${lnum}|${col}|${item.regtype}|${item.filetype}`
      lines.push(line)
      lines.push(...item.content.map(s => `\t${s}`))
    }

    fs.writeFileSync(this.file, lines.join('\n') + '\n', 'utf8')
  }

  private convertJson(jsonFile: string): void {
    if (!fs.existsSync(jsonFile)) return
    try {
      let content = fs.readFileSync(jsonFile, 'utf8')
      let items = JSON.parse(content).map(
        ({ content, filepath, regtype, filetype }) => this.buildItem(content, filepath, regtype, filetype)
      )
      this.write(items)
    } catch (_e) {
      // noop
    }
    fs.unlinkSync(jsonFile)
  }

  public clean(): void {
    if (fs.existsSync(this.file)) {
      fs.unlinkSync(this.file)
    }
  }

  public async load(): Promise<HistoryItem[]> {
    if (!fs.existsSync(this.file)) return []
    let items: HistoryItem[] = []
    try {
      let content = await readFile(this.file)
      let lines: string[] = []
      let item: HistoryItem = null
      for (let line of content.split(/\r?\n/)) {
        if (line.startsWith('\t')) {
          lines.push(line.slice(1))
        } else {
          if (item) {
            item.content = lines
            items.push(item)
            lines = []
          }
          let [hash, path, lnum, col, regtype, filetype] = line.split('|')
          item = {
            id: hash,
            path: `${path}\t${lnum}\t${col}`,
            regtype,
            filetype,
            content: []
          }
        }
      }
      return items
    } catch (e) {
      return []
    }
  }

  public async add(content: string[], regtype: string, filepath: string, filetype: string): Promise<void> {
    let item = this.buildItem(content, filepath, regtype, filetype)
    let items = await this.load()
    let idx = items.findIndex(o => o.id == item.id)
    if (idx != -1) return
    items.push(item)
    this.write(items)
  }

  public async delete(id: string | string[]): Promise<void> {
    let items = await this.load()
    items = items.filter(o => {
      if (typeof id == 'string') return o.id != id
      return id.indexOf(o.id) == -1
    })

    this.write(items);
  }
}
