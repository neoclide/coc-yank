import { BasicList, ListContext, workspace, ListItem } from 'coc.nvim'
import { Position, Range, TextEdit } from 'vscode-languageserver-protocol'
import { Neovim } from '@chemzqm/neovim'
import DB from '../db'
import colors from 'colors/safe'

interface Data {
  content: string[]
  regtype: string
  id: string
}

export default class YankList extends BasicList {
  public readonly name = 'yank'
  public readonly description = 'list of yank history'
  public defaultAction = 'append'

  constructor(nvim: Neovim, private db: DB) {
    super(nvim)

    this.addAction('append', async (item: ListItem) => {
      let { document, position } = await workspace.getCurrentState()
      let doc = workspace.getDocument(document.uri)
      let edits: TextEdit[] = []
      let { regtype, content } = item.data as Data
      let line = doc.getline(position.line)
      if (regtype == 'v') {
        let pos = Position.create(position.line, Math.min(position.character + 1, line.length))
        edits.push({
          range: Range.create(pos, pos),
          newText: content.join('\n')
        })
      } else if (regtype == 'V') {
        let pos = Position.create(position.line + 1, 0)
        edits.push({
          range: Range.create(pos, pos),
          newText: content.join('\n') + '\n'
        })
      } else {
        let col = await nvim.call('col', ['.']) as number
        for (let i = position.line; i < position.line + content.length; i++) {
          let line = doc.getline(i)
          let character = byteSlice(line, 0, col + 1).length
          let pos = Position.create(i, character)
          edits.push({
            range: Range.create(pos, pos),
            newText: content[i - position.line]
          })
        }
      }
      await doc.applyEdits(nvim, edits)
    })

    this.addAction('prepend', async (item: ListItem) => {
      let { document, position } = await workspace.getCurrentState()
      let doc = workspace.getDocument(document.uri)
      let edits: TextEdit[] = []
      let { regtype, content } = item.data as Data
      if (regtype == 'v') {
        let pos = Position.create(position.line, position.character)
        edits.push({
          range: Range.create(pos, pos),
          newText: content.join('\n')
        })
      } else if (regtype == 'V') {
        let pos = Position.create(position.line, 0)
        edits.push({
          range: Range.create(pos, pos),
          newText: content.join('\n') + '\n'
        })
      } else {
        let col = await nvim.call('col', ['.']) as number
        for (let i = position.line; i < position.line + content.length; i++) {
          let line = doc.getline(i)
          let character = byteSlice(line, 0, col).length
          let pos = Position.create(i, character)
          edits.push({
            range: Range.create(pos, pos),
            newText: content[i - position.line]
          })
        }
      }
      await doc.applyEdits(nvim, edits)
    })

    this.addAction('open', (item: ListItem) => {
      let content = item.data.path as string
      let parts = content.split('\t')
      let position = Position.create(Number(parts[1]) - 1, Number(parts[2]) - 1)
      workspace.jumpTo(parts[0], position)
    })

    this.addAction('yank', (item: ListItem) => {
      let content = item.data.content as string[]
      content = content.map(s => s.replace(/\\/g, '\\\\').replace(/"/, '\\"'))
      nvim.command(`let @" = "${content.join('\\n')}"`, true)
    })

    this.addAction('delete', async (item: ListItem) => {
      let { id } = item.data
      await this.db.delete(id)
    }, { persist: true, reload: true })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let arr = await this.db.load()
    let columns = await this.nvim.getOption('columns') as number
    let res: ListItem[] = []
    for (let item of arr) {
      let regtype: string
      if (item.regtype == 'v') {
        regtype = 'char '
      } else if (item.regtype == 'V') {
        regtype = 'line '
      } else {
        regtype = 'block'
      }
      let text = item.content.join(' ')
      let abbr = text.length > columns - 15 ? text.slice(0, columns - 15) + colors.grey('...') : text
      res.push({
        label: `${colors.yellow(regtype)} ${abbr}`,
        filterText: abbr,
        data: { content: item.content, path: item.path, regtype: item.regtype, id: item.id }
      })
    }
    return res
  }
}

function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
