" Load all modified files in git into the quickfix (doesn't include untracked files)
command! -nargs=? -bar GLoadChanged call setqflist(map(systemlist("git diff --name-only HEAD"), '{"filename": v:val, "lnum": 1}'))

function! AttributeCoauthorship(nameAndEmail)
  let attribution = "Co-authored-by: " . a:nameAndEmail
  silent put =attribution
endfunction

function! Coauthorship()
  call fzf#run({
    \ 'source': 'git log --pretty="%an <%ae>" | sort | uniq',
    \ 'sink': function('AttributeCoauthorship'),
    \ 'options': "--preview 'git log -1 --author {} --pretty=\"authored %h %ar:%n%n%B\"'"
    \ })
endfunction

command! Coauthorship call Coauthorship()
