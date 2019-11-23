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

  private convertJson(jsonFile: string): void {
    if (!fs.existsSync(jsonFile)) return
    try {
      let content = fs.readFileSync(jsonFile, 'utf8')
      let arr = JSON.parse(content) as HistoryItem[]
      let lines: string[] = []
      for (let item of arr) {
        let hash = crypto.createHash('md5').update(item.content.join('\n')).digest('hex')
        let [path, lnum, col] = item.path.split('\t')
        let line = `${hash}|${path}|${lnum}|${col}|${item.regtype}|${item.filetype}`
        lines.push(line)
        lines.push(...item.content.map(s => `\t${s}`))
      }
      fs.writeFileSync(this.file, lines.join('\n') + '\n', 'utf8')
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
    let lines: string[] = []
    let hash = crypto.createHash('md5').update(content.join('\n')).digest('hex')
    let items = await this.load()
    let idx = items.findIndex(o => o.id == hash)
    if (idx != -1) return
    let [path, lnum, col] = filepath.split('\t')
    let line = `${hash}|${path}|${lnum}|${col}|${regtype}|${filetype}`
    lines.push(line)
    lines.push(...content.map(s => `\t${s}`))
    fs.appendFileSync(this.file, lines.join('\n') + '\n', 'utf8')
  }

  public async delete(id: string | string[]): Promise<void> {
    let items = await this.load()
    items = items.filter(o => {
      if (typeof id == 'string') return o.id != id
      return id.indexOf(o.id) == -1
    })
    let lines: string[] = []
    for (let item of items) {
      let [path, lnum, col] = item.path.split('\t')
      let line = `${item.id}|${path}|${lnum}|${col}|${item.regtype}|${item.filetype}`
      lines.push(line)
      lines.push(...item.content.map(s => `\t${s}`))
    }
    fs.writeFileSync(this.file, lines.join('\n') + '\n', 'utf8')
  }
}
