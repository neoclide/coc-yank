import fs from 'fs'
import util from 'util'

export async function statAsync(filepath: string): Promise<fs.Stats | null> {
  let stat = null
  try {
    stat = await util.promisify(fs.stat)(filepath)
  } catch (e) { } // tslint:disable-line
  return stat
}

export async function writeFile(fullpath, content: string): Promise<void> {
  await util.promisify(fs.writeFile)(fullpath, content, 'utf8')
}

export function readFile(fullpath: string, encoding = 'utf8'): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(fullpath, encoding, (err, content) => {
      if (err) reject(err)
      resolve(content)
    })
  })
}

export function mkdirAsync(filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(filepath, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function group<T>(array: T[], size: number): T[][] {
  let len = array.length
  let res: T[][] = []
  for (let i = 0; i < Math.ceil(len / size); i++) {
    res.push(array.slice(i * size, (i + 1) * size))
  }
  return res
}
