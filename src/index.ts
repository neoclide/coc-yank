import { ExtensionContext, listManager, workspace } from 'coc.nvim'
import { group, statAsync, mkdirAsync } from './util'
import YankList from './list/yank'
import DB from './db'

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions, storagePath } = context
  let stat = await statAsync(storagePath)
  if (!stat || !stat.isDirectory()) {
    await mkdirAsync(storagePath)
  }
  let db = new DB(storagePath)
  const config = workspace.getConfiguration('yank')
  if (config.get<boolean>('highlight.enable', true)) {
    workspace.nvim.command('highlight default link HighlightedyankRegion IncSearch', true)
  }
  subscriptions.push(listManager.registerList(new YankList(workspace.nvim, db)))
  subscriptions.push(workspace.registerAutocmd({
    event: 'TextYankPost',
    arglist: ['v:event', "+expand('<abuf>')"],
    callback: async (event, bufnr) => {
      let { nvim } = workspace
      let { regtype, operator, regcontents } = event
      if (operator != 'y') return
      let enable = config.get<boolean>('highlight.enable', true)
      let doc = workspace.getDocument(bufnr)
      if (!doc) return
      let [, lnum, col] = await nvim.call('getpos', ["'["])
      if (enable) {
        let ids: number[] = []
        let ranges: number[][] = []
        let duration = config.get<number>('highlight.duration', 500)
        // block selection
        if (regtype.startsWith('\x16')) {
          let view = await nvim.call('winsaveview')
          await nvim.call('setpos', ['.', [0, lnum, col, 0]])
          for (let i = lnum; i < lnum + regcontents.length; i++) {
            let col = await nvim.call('col', ['.'])
            ranges.push([i, col, Number(regtype[1])])
            await nvim.command('normal! j')
          }
          await nvim.call('winrestview', [view])
        } else if (regtype == 'v') {
          for (let i = lnum; i < lnum + regcontents.length; i++) {
            if (i == lnum) {
              ranges.push([i, col, Buffer.byteLength(regcontents[0])])
            } else {
              ranges.push([i, 1, Buffer.byteLength(regcontents[i - lnum])])
            }
          }
        } else if (regtype == 'V') {
          for (let i = lnum; i < lnum + regcontents.length; i++) {
            ranges.push([i])
          }
        } else {
          return
        }
        for (let list of group(ranges, 8)) {
          let id = await nvim.call('matchaddpos', ['HighlightedyankRegion', list, 99]) as number
          ids.push(id)
        }
        if (ids.length) {
          setTimeout(async () => {
            await nvim.call('coc#util#clearmatches', [bufnr, ids])
          }, duration)
        }
      }
      let path = `${doc.uri}\t${lnum}\t${col}`
      regtype = regtype.startsWith('\x16') ? '^v' : regtype
      await db.add(regcontents, regtype, path)
    }
  }))
}
