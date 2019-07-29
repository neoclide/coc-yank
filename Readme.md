# coc-yank

Yank extension for [coc.nvim](https://github.com/neoclide/coc.nvim).

## Install

In your vim/neovim, run command:

```
:CocInstall coc-yank
```

Setup keymap to open yank list like:

```
nnoremap <silent> <space>y  :<C-u>CocList -A --normal yank<cr>
```

`-A` means auto preview, and `--normal` means open list on normal mode.

## Features

- Highlight yanked text.
- Provide persist yank list cross vim instance.

## Options

- `yank.highlight.enable` enable highlight feature, default: `true`.
- `yank.highlight.duration` duration of highlight in miliseconds, default: 500.
- `yank.list.maxsize` maxsize of yank list, default: 200
- `yank.enableCompletion`: Enable completion support for yanked text, default: `true`
- `yank.priority`: Priority of yank completion source, default: 90.
- `yank.limit`: Max completion item count from yank history.

## F.A.Q

Q: How to change highlight color?

A: Add `hi HighlightedyankRegion term=bold ctermbg=0 guibg=#13354A` to your
`.vimrc` after `:colorscheme` command.

## License

MIT
