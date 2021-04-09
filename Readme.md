# coc-yank

Yank extension for [coc.nvim](https://github.com/neoclide/coc.nvim).

Note, make sure you have TextYankPost autocmd with your vim by
`:echo exists('##TextYankPost')`

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
- Persist yank list across vim instances.

## Options

- `yank.highlight.enable` enable highlight feature, default: `true`.
- `yank.highlight.duration` duration of highlight in miliseconds, default: 500.
- `yank.list.maxsize` maxsize of yank list, default: 200
- `yank.enableCompletion`: Enable completion support for yanked text, default: `true`
- `yank.priority`: Priority of yank completion source, default: 90.
- `yank.limit`: Max completion item count from yank history.
- `yank.shortcut`: Shortcut for yank source, default: "YANK".

## F.A.Q

Q: How to change highlight color?

A: Add `hi HighlightedyankRegion cterm=bold gui=bold ctermbg=0 guibg=#13354A` to your
`.vimrc` after `:colorscheme` command.

Q: How to clear all yanks?

A: In vim, `:CocCommand yank.clean`

## License

MIT
