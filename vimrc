"
execute pathogen#infect()
" 
"            stuff taken from here and there
" 
"           http://amix.dk/blog,
"
"
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
filetype plugin indent on

set vb " visualbell!


" Set mapleader
let mapleader = ","
let g:mapleader = ","

set modeline

" XML 
"let g:xml_syntax_folding=1
au FileType xml setlocal foldmethod=syntax
au FileType xslt setlocal foldmethod=syntax
au FileType xhtml setlocal foldmethod=syntax
au FileType html setlocal foldmethod=syntax
noremap <Leader>v  :!clear;xmllint --noout --loaddtd --xinclude --postvalid %

" Ctrl X O  ->
autocmd FileType python set omnifunc=pythoncomplete#Complete
autocmd FileType javascript set omnifunc=javascriptcomplete#CompleteJS
autocmd FileType html set omnifunc=htmlcomplete#CompleteTags
autocmd FileType css set omnifunc=csscomplete#CompleteCSS
autocmd FileType xml set omnifunc=xmlcomplete#CompleteTags
autocmd FileType php set omnifunc=phpcomplete#CompletePHP
autocmd FileType c set omnifunc=ccomplete#Complete
autocmd FileType sh set omnifunc=shcomplete#CompleteSH

" Faaancy commenterr
autocmd FileType javascript,php,c,java,go map <leader>ccb I//  <Esc>A  //<Esc>yyp0llv$hhhr-yykPjj
autocmd FileType python,ruby,sh,zsh,bash,m4,make map <leader>ccb I#  <Esc>A  #<Esc>yyp0lv$hhr-yykPjj

" JSHint
nnoremap <silent><F1> :JSHint<CR>
inoremap <silent><F1> <C-O>:JSHint<CR>
vnoremap <silent><F1> :JSHint<CR>
cnoremap <F1> JSHint

" JSHint onOpen .js 
autocmd! BufWinEnter * if &filetype == "javascript" | silent JSHint | endif
" JSHint justBeforeSave .js
autocmd! BufWritePost * if &filetype == "javascript" | silent JSHint | endif 

set nocompatible
set mouse=a
set title

" Hugefont for blind bat
"set gfn=Ubuntu\ Mono\ 13
set gfn=PragmataPro\ 13

" C stuff
" ctags mapping
"" from http://amix.dk/blog/viewEntry/19329
map <F7> :TlistToggle<CR>
imap <F7> <Esc>:TlistToggle<CR>
map <F8> :!/usr/bin/ctags -R --c++-kinds=+p --fields=+iaS --extra=+q .<CR>
imap <F8> <Esc>:!/usr/bin/ctags -R --c++-kinds=+p --fields=+iaS --extra=+q .<CR>
map <F5> :%!astyle --mode=c -p -U -w -k2 -O -j -A10<CR>
imap <F5> <Esc>:%!astyle --mode=c -p -U -w -k2 -O -j -A10<CR>

"
" ----------------------
" color 
" ---------------------
set t_Co=256

if !has('gui_running')
    colo blue
else
 colo solarized
 set background=dark
endif

" colo fruity 
" colo elflord
" colo night_kdm
" colo blue

" -----------------------
" statusline
" -----------------------
set statusline=%F%m%r%h%w\ (%Y)\ [Fmt=%{&ff}]\ [row:%03l\ col:%03v][%p%%]\ [LEN=%L]\ %{strftime(\"%y.%m.%d-%H:%M\",getftime(expand(\"%:p\")))}

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
endif

" -------------------------
" whitespace magico
" ---------------------------
"set list

" Shortcut to rapidly toggle `set list`
nmap <leader>l :set list!<CR>
"
" Use the same symbols as TextMate for tabstops and EOLs
set listchars=tab:▸\ ,eol:┐



" -------------------
" searching
" -------------------

set hlsearch
set incsearch
set ignorecase 
set smartcase
noremap <F3> :set hlsearch!<CR>
noremap <F4>   :%s/
vnoremap <F4>  <Esc>:%s/
inoremap <F4>  <Esc>:%s/

" Tab help
nmap <leader>t :tabnew<cr>
map <C-t> <Esc>:tabnew<space>
noremap <C-Up>   gT
vnoremap <C-Up>  <Esc>gT
inoremap <C-Up>  <Esc>gT
noremap <C-Down>   gt
vnoremap <C-Down>  <Esc>gt
inoremap <C-Down>  <Esc>gt

map gf :tabnew <cfile><CR>

" buff help
map <S-C-b> <Esc>:bn<cr>
map! <S-C-b> <Esc>:bn<cr>
imap <S-C-b> <Esc>:bn<cr>
noremap <S-C-d>   :bdel<CR>
vnoremap <S-C-d>  <Esc>:bdel<CR>
inoremap <S-C-d>  <Esc>:bdel<CR>

" Fast saving
" NB! Read this: http://sealence.x10hosting.com/wordpress/?p=28 
" ( deactive Ctrl-S default behaviour in xterms )
noremap <C-S>          :update<CR>
vnoremap <C-S>         <Esc>:update<CR>
inoremap <C-S>         <Esc>:update<CR>
"map <leader>w :w!<cr>

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
set tabstop=4
set softtabstop=4
set shiftwidth=4
set expandtab

set textwidth=120

" FULL SCREEN IN GVIM
"set guioptions-=M
"set guioptions-=m
"set guioptions-=T

