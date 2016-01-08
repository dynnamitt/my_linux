"
execute pathogen#infect()
" 
"            stuff taken from here and there
" 
"           http://amix.dk/blog,
"
"



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

" XML 
"let g:xml_syntax_folding=1
" au FileType xml setlocal foldmethod=syntax
" au FileType xslt setlocal foldmethod=syntax
" au FileType xhtml setlocal foldmethod=syntax
" au FileType html setlocal foldmethod=syntax
noremap <Leader>V  :!clear;xmllint --noout --loaddtd --xinclude --postvalid %
noremap <Leader>x :1,$ !xmllint --format %<CR>
au BufRead,BufNewFile *.hbs set ft=html
au BufRead,BufNewFile *.handlebars set ft=html
au BufRead,BufNewFile *.handlebar set ft=html

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
autocmd FileType python,ruby,sh,zsh,bash,m4,make map <leader>ccb I#  <Esc>A  #<Esc>yyp0lv$hhr-yykPjj
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
"set gfn=Ubuntu\ Mono\ 13
set gfn=WenQuanYi\ Micro\ Hei\ Mono\ 10
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
colo desert
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
  au InsertLeave * set cursorline 
"   au InsertEnter * hi StatusLine guibg=orange
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
noremap <F3> :set nohlsearch<CR>
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

