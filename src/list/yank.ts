import { Neovim, BasicList, ListContext, workspace, ListItem } from 'coc.nvim'
import { Position, Range, TextEdit } from 'vscode-languageserver-protocol'
import DB, { HistoryItem } from '../db'
import colors from 'colors/safe'

export default class YankList extends BasicList {
  public readonly name = 'yank'
  public readonly description = 'list of yank history'
  public defaultAction = 'append'

  constructor(nvim: Neovim, private db: DB) {
    super(nvim)

    this.addAction('append', async (item: ListItem) => {
      let { document, position } = await workspace.getCurrentState()
      let doc = workspace.getDocument(document.uri)
      if (!doc || !doc.attached) {
        workspace.showMessage(`Current document not attached.`)
        return
      }
      let edits: TextEdit[] = []
      let { regtype, content } = item.data as HistoryItem
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
      await doc.applyEdits(edits)
    })

    this.addAction('prepend', async (item: ListItem) => {
      let { document, position } = await workspace.getCurrentState()
      let doc = workspace.getDocument(document.uri)
      if (!doc || !doc.attached) {
        workspace.showMessage(`Current document not attached.`)
        return
      }
      let edits: TextEdit[] = []
      let { regtype, content } = item.data as HistoryItem
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
      await doc.applyEdits(edits)
    })

    this.addAction('open', async (item: ListItem) => {
      let content = item.data.path as string
      let parts = content.split('\t')
      let position = Position.create(Number(parts[1]) - 1, Number(parts[2]) - 1)
      await workspace.jumpTo(parts[0], position)
    })

    this.addAction('yank', (item: ListItem) => {
      let content = item.data.content as string[]
      content = content.map(s => s.replace(/\\/g, '\\\\').replace(/"/, '\\"'))
      nvim.command(`let @" = "${content.join('\\n')}"`, true)
    })

    this.addMultipleAction('delete', async (items: ListItem[]) => {
      let ids = items.map(o => o.data.id)
      await this.db.delete(ids)
    }, { persist: true, reload: true })

    this.addAction('preview', async (item: ListItem, context) => {
      let { filetype, content } = item.data as HistoryItem
      this.preview({
        sketch: true,
        filetype,
        lines: content
      }, context)
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    let arr = await this.db.load()
    let columns = await this.nvim.getOption('columns') as number
    let res: ListItem[] = []
    for (let item of arr.reverse()) {
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
        data: Object.assign({}, item)
      })
    }
    return res
  }
}

function byteSlice(content: string, start: number, end?: number): string {
  let buf = Buffer.from(content, 'utf8')
  return buf.slice(start, end).toString('utf8')
}
