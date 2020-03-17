" Load all modified files in git into the quickfix (doesn't include untracked files)
command! -nargs=? -bar GLoadChanged call setqflist(map(systemlist("git diff --name-only HEAD"), '{"filename": v:val, "lnum": 1}'))
