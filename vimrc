"

" new vim-plug fancy joy
call plug#begin('~/.vim/plugged')

  Plug 'nathanaelkane/vim-indent-guides'
  Plug 'scrooloose/nerdtree' " F9
  Plug 'Xuyuanp/nerdtree-git-plugin' " a bit sad.............
  Plug 'tpope/vim-sensible' " essentials!
  Plug 'tpope/vim-unimpaired' " [q ]q ]a ]b ..
  Plug 'tpope/vim-repeat' " . sanity!
  Plug 'tpope/vim-surround' " cs.'   on .word. -> 'word'
  Plug 'tpope/vim-commentary' " gc / gcc
  Plug 'ctrlpvim/ctrlp.vim' " FuzzyFind ala emacs
  Plug 'vim-airline/vim-airline' " 2D statusbar
  Plug 'ryanoasis/vim-devicons' " unicode-flashy
  Plug 'calebsmith/vim-lambdify' " lamda zippr visual
  Plug 'moll/vim-bbye' " cleaner :bdelete

  " ft
  Plug 'python-mode/python-mode', { 'for': 'python', 'branch': 'develop' }
  Plug 'Shutnik/jshint2.vim', {'for':'javascript'}
  Plug 'pangloss/vim-javascript', {'for':'javascript'}
  "#Plug 'kchmck/vim-coffee-script', {'for':'coffee'}
  "#Plug 'wlangstroth/vim-racket', {'for':['scheme','racket']}
  Plug 'ElmCast/elm-vim', {'for':'elm'}
  Plug 'gkz/vim-ls'
  Plug 'sukima/xmledit'
 " Plug 'evanmiller/nginx-vim-syntax' 
  Plug 'ekalinin/Dockerfile.vim'
  Plug 'moll/vim-node'
  Plug 'chrisbra/csv.vim'
  Plug 'mustache/vim-mustache-handlebars'

  Plug 'ninja/sky' " colo just for dark term
  Plug 'nanotech/jellybeans.vim' " colo dark
  Plug 'AlessandroYorba/Sierra' "colo dark
  Plug 'vim-scripts/Sift' " colo dark
  Plug 'vim-airline/vim-airline-themes' " colo PLENTY!
  Plug 'fcpg/vim-fahrenheit' "browny


call plug#end()

" airline/powerline
let g:airline_theme='molokai'
" took out 'trailing' below;
let g:airline#extensions#whitespace#checks = [ 'indent', 'long', 'mixed-indent-file' ]  

let g:indent_guides_enable_on_vim_startup = 1

let g:airline_powerline_fonts = 1
if !exists('g:airline_symbols')
  let g:airline_symbols = {}
endif
let g:airline_symbols.space = "\ua0"

" minor color tweaks
let g:sierra_Midnight = 1

" missing filetypes COMMENTARY
autocmd FileType apache setlocal commentstring=#\ %s
autocmd FileType nginx setlocal commentstring=#\ %s

"      stuff taken from here and there
"         http://amix.dk/blog,

let g:WebDevIconsNerdTreeBeforeGlyphPadding = ''
let g:WebDevIconsNerdTreeAfterGlyphPadding = ''
let g:WebDevIconsNerdTreeGitPluginForceVAlign = 1
let g:NERDTreeGitStatusIndicatorMapCustom = {
    \ "Modified"  : "✹",
    \ "Staged"    : "✚",
    \ "Untracked" : "✭",
    \ "Renamed"   : "➜",
    \ "Unmerged"  : "═",
    \ "Deleted"   : "✖",
    \ "Dirty"     : "✗",
    \ "Clean"     : "✔︎",
    \ "Unknown"   : "?"
    \ }


" NERDTress File highlighting
function! NERDTreeHighlightFile(extension, fg, bg, guifg, guibg)
exec 'autocmd FileType nerdtree highlight ' . a:extension .' ctermbg='. a:bg .' ctermfg='. a:fg .' guibg='. a:guibg .' guifg='. a:guifg
exec 'autocmd FileType nerdtree syn match ' . a:extension .' #^\s\+.*'. a:extension .'$#'
endfunction

au VimEnter * call NERDTreeHighlightFile('jade', 'green', 'none', 'green', '#151515')
au VimEnter * call NERDTreeHighlightFile('ini', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('md', 'blue', 'none', '#3366FF', '#151515')
au VimEnter * call NERDTreeHighlightFile('yml', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('config', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('conf', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('json', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('html', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('handlebars', 'yellow', 'none', 'yellow', '#151515')
au VimEnter * call NERDTreeHighlightFile('styl', 'cyan', 'none', 'cyan', '#151515')
au VimEnter * call NERDTreeHighlightFile('css', 'cyan', 'none', 'cyan', '#151515')
au VimEnter * call NERDTreeHighlightFile('js', 'Red', 'none', 'red', '#151515')
au VimEnter * call NERDTreeHighlightFile('coffee', 'Red', 'none', '#ffa500', '#151515')
au VimEnter * call NERDTreeHighlightFile('rb', 'Red', 'none', '#ffa500', '#151515')
au VimEnter * call NERDTreeHighlightFile('php', 'Magenta', 'none', '#ff00ff', '#151515')

" Like bufdo but restore the current buffer.
function! BufDo(command)
  let currBuff=bufnr("%")
  execute 'bufdo ' . a:command
  execute 'buffer ' . currBuff
endfunction
com! -nargs=+ -complete=command Bufdo call BufDo(<q-args>)


" ubersaver

cmap w!! w !sudo tee % >/dev/null

set matchpairs+=<:>

" reload if file changes
noremap <F2>   :edit!<CR>
vnoremap <F2>  <Esc>:edit!<CR>
inoremap <F2>  <Esc>:edit!<CR>

" golang
set rtp+=$GOROOT/misc/vim

syntax on
set nocompatible
filetype plugin on 
filetype indent on


set vb " visualbell!


" Set mapleader
let mapleader = ","
let g:mapleader = ","


" Build aka make
noremap <Leader>b :w<CR>:silent make! \| vertical cwindow


set modeline

" coffeescript
""autocmd BufWritePost,FileWritePost *.coffee silent !coffee -c <afile>


" FT


" systemd (more or less SH)
au BufRead,BufNewFile *.service set ft=sh
au BufRead,BufNewFile *.service.m4 set ft=sh

" NGX xtra
au BufRead,BufNewFile */nginx/*.conf set ft=nginx
au BufRead,BufNewFile */ngx/*.conf set ft=nginx
au BufRead,BufNewFile *.conf set ft=nginx

" XML 
"let g:xml_syntax_folding=1
" au FileType xml setlocal foldmethod=syntax
" au FileType xslt setlocal foldmethod=syntax
" au FileType xhtml setlocal foldmethod=syntax
" au FileType html setlocal foldmethod=syntax
noremap <Leader>V  :!clear;xmllint --noout --loaddtd --xinclude --postvalid %
noremap <Leader>x :1,$ !xmllint --format %<CR>
" au BufRead,BufNewFile *.hbs set ft=html
" au BufRead,BufNewFile *.handlebars set ft=html
" au BufRead,BufNewFile *.handlebar set ft=html

" Ctrl X O  ->
set omnifunc=syntaxcomplete#Complete
" autocmd FileType python set omnifunc=pythoncomplete#Complete
" autocmd FileType javascript set omnifunc=javascriptcomplete#CompleteJS
" autocmd FileType html set omnifunc=htmlcomplete#CompleteTags
" autocmd FileType css set omnifunc=csscomplete#CompleteCSS
" autocmd FileType xml set omnifunc=xmlcomplete#CompleteTags
" autocmd FileType php set omnifunc=phpcomplete#CompletePHP
" autocmd FileType c set omnifunc=ccomplete#Complete
" autocmd FileType sh set omnifunc=shcomplete#CompleteSH

" Faaancy commenterr
autocmd FileType javascript,php,c,java,go map <leader>ccb I//  <Esc>A  //<Esc>yyp0llv$hhhr-yykPjj
autocmd FileType python,ruby,sh,zsh,coffee,bash,m4,make,nginx,apache map <leader>ccb I#  <Esc>A  #<Esc>yyp0lv$hhr-yykPjj
" NerdTree
nnoremap <silent><F9> :NERDTreeToggle<CR>
inoremap <silent><F9> <C-O>:NERDTreeToggle<CR>
vnoremap <silent><F9> :NERDTreeToggle<CR>
cnoremap <F9> NERDTreeToggle


" JSHint
nnoremap <silent><F1> :JSHint<CR>
inoremap <silent><F1> <C-O>:JSHint<CR>
vnoremap <silent><F1> :JSHint<CR>
cnoremap <F1> JSHint

" JSHint onOpen .js 
autocmd! BufWinEnter * if &filetype == "javascript" | silent JSHint | endif
" JSHint justBeforeSave .js
autocmd! BufWritePost * if &filetype == "javascript" | silent JSHint | endif 

set mouse=a
set title


" keyssssssss
nmap <S-Enter> O<Esc>j
nmap <CR> o<Esc>k
map <up> <nop>
map <down> <nop>
map <left> <nop>
map <right> <nop>

" dont skip wrapped parts of line
nnoremap j gj
nnoremap k gk

" Hugefont for blind bat
set gfn=Fura\ Mono\ for\ Powerline\ 10
"set gfn=Ubuntu\ Mono\ 13
"set gfn=WenQuanYi\ Micro\ Hei\ Mono\ 10
"set gfn=PragmataPro\ 13
" MS Consolas !!
"set gfn=Consolas\ 12
"

" C stuff
" ctags mapping
"" from http://amix.dk/blog/viewEntry/19329
map <F7> :TlistToggle<CR>
imap <F7> <Esc>:TlistToggle<CR>
map <F8> :!make tags<CR>
imap <F8> <Esc>:!make tags<CR>
map <F5> :%!astyle --mode=c -p -U -w -k2 -O -j -A10<CR>
imap <F5> <Esc>:%!astyle --mode=c -p -U -w -k2 -O -j -A10<CR>

"
" ----------------------
" color 
" ---------------------
set t_Co=256
"colo jellybeans " fahrenheit  sift , jellybeans , desert

" if !has('gui_running')
"   "colo blue
"  colo solarized
"  set background=dark
" else
"  colo solarized
"  set background=dark
" endif

" overflowin lines
highlight OverLength ctermbg=red ctermfg=white guibg=#592929
match OverLength /\%81v.\+/

let g:niji_matching_filetypes = ['lisp', 'scheme', 'clojure','racket']

" -----------------------
" statusline
" -----------------------
set statusline=\|\|\ %F%m%r%h%w\ (%Y)\ row:%03l\ col:%03v[%p%%]\ LEN=%L

set laststatus=2

set showcmd
" -----------------------
" cursorline
" -----------------------
set cursorline
if version >= 700
  " now set it up to change the CURSOR line based on mode
  au InsertEnter * set nocursorline
  au InsertLeave,BufWinEnter * set cursorline 
 au InsertLeave * hi StatusLine guibg=white 
 au VimEnter,WinEnter,BufWinEnter * stopinsert

endif

" no need:
" augroup CursorLine
"   au!
"   au VimEnter,WinEnter,BufWinEnter * setlocal cursorline
"   au WinLeave * setlocal nocursorline
" augroup END

set guicursor+=n-v-c:blinkon0
let &t_SI = "\<Esc>]50;CursorShape=1\x7" " Vertical bar in insert mode
let &t_EI = "\<Esc>]50;CursorShape=0\x7" " Block in normal mode

" -------------------------
" whitespace magico
" ---------------------------
set list

" Shortcut to rapidly toggle `set list`
nmap <leader>l :set list!<CR>
"
" Use the same symbols as TextMate for tabstops and EOLs
set listchars=tab:▸\ 



" -------------------
" searching
" -------------------

set hlsearch
set incsearch
set ignorecase 
set smartcase
noremap <F3>:if (hlstate == 0) \| nohlsearch \| else \| set hlsearch \| endif \| let hlstate=1-hlstate<cr>
nmap <silent> ,/  :nohlsearch<CR>
noremap <F4>   :%s/
vnoremap <F4>  <Esc>:%s/
inoremap <F4>  <Esc>:%s/

" Tab help
" nmap <leader>t :tabnew<cr>
" map <C-t> <Esc>:tabnew<space>
" noremap <C-Up>   gT
" vnoremap <C-Up>  <Esc>gT
" inoremap <C-Up>  <Esc>gT
" noremap <C-Down>   gt
" vnoremap <C-Down>  <Esc>gt
" inoremap <C-Down>  <Esc>gt

"map gf :tabnew <cfile><CR>

" buff help
set wildcharm=<C-Z>
nnoremap <F10> :b <C-Z>
map <Leader>s :sbuffer<space>
map <Leader>v :vert sb<space>
nnoremap <Leader>q :Bdelete<CR>

" Fast saving
" NB! Read this: http://sealence.x10hosting.com/wordpress/?p=28 
" ( deactive Ctrl-S default behaviour in xterms )
noremap <C-s>          :update<CR>
vnoremap <C-s>         <Esc>:update<CR>
inoremap <C-s>         <Esc>:update<CR>
" save all
noremap <C-a>          :BufDo execute "normal! @a" | update<CR>
vnoremap <C-a>         <Esc>:BufDo execute "normal! @a" | update<CR>
inoremap <C-a>         <Esc>:BufDo execute "normal! @a" | update<CR>

" autosave if buff-leave
:au FocusLost * silent! wa

" oldfiles TDOD FIX
set viminfo='20,<50,s10,h
noremap <C-l>          :browse ol<CR>
vnoremap <C-l>         <Esc>:browse ol<CR>
inoremap <C-l>         <Esc>:browse ol<CR>

" cut n paste
"vmap <C-c> y
"vmap <C-x> d
"imap <C-v> <Esc>P


" find
nmap <leader>f :find<cr>

" easy update/reload
:nmap <Leader>m :source $MYVIMRC
:nmap <Leader>M :e $MYVIMRC


" Turn on WiLd menu
"set wildmode=list:longest

" Always show current position
set ruler

" Show line number
set nu

" buffer change (without masing)
set hidden

set history=1000

" plugins ::
runtime plugin/matchit.vim
"runtime plugin/go.vim
au BufRead,BufNewFile *.go set filetype=go
"    (off) runtime plugin/ant_menu.vim

  
" Indenting and tab
set smartindent
set tabstop=2
set softtabstop=2
set shiftwidth=2
set expandtab

set textwidth=120

" FULL SCREEN IN GVIM
"set guioptions-=M
"set guioptions-=m
"set guioptions-=T

