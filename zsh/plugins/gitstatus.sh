export __GIT_PROMPT_DIR="$ZSH_HOME/plugins"

# Allow for functions in the prompt.
setopt PROMPT_SUBST

autoload -U add-zsh-hook

add-zsh-hook chpwd chpwd_update_git_vars
add-zsh-hook precmd precmd_update_git_vars

## Function definitions
function precmd_update_git_vars() {
  update_current_git_vars
}

function chpwd_update_git_vars() {
  update_current_git_vars
}

function update_current_git_vars() {
  unset __CURRENT_GIT_STATUS

  local gitstatus="$__GIT_PROMPT_DIR/gitstatus.py"
  _GIT_STATUS=`python ${gitstatus}`
  __CURRENT_GIT_STATUS=("${(@f)_GIT_STATUS}")
  GIT_BRANCH=$__CURRENT_GIT_STATUS[1]
  GIT_REMOTE=$__CURRENT_GIT_STATUS[2]
  GIT_STAGED=$__CURRENT_GIT_STATUS[3]
  GIT_CONFLICTS=$__CURRENT_GIT_STATUS[4]
  GIT_CHANGED=$__CURRENT_GIT_STATUS[5]
  GIT_UNTRACKED=$__CURRENT_GIT_STATUS[6]
  GIT_CLEAN=$__CURRENT_GIT_STATUS[7]
}


git_super_status() {
  precmd_update_git_vars
  if [ -n "$__CURRENT_GIT_STATUS" ]; then
    STATUS="$ZSH_THEME_GIT_PROMPT_PREFIX$ZSH_THEME_GIT_PROMPT_BRANCH$GIT_BRANCH${RESET}"
    if [ -n "$GIT_REMOTE" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_SEPARATOR$ZSH_THEME_GIT_PROMPT_REMOTE$GIT_REMOTE${RESET}"
    fi
    STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_SEPARATOR"
    if [ "$GIT_STAGED" -ne "0" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_STAGED$GIT_STAGED${RESET}"
    fi
    if [ "$GIT_CONFLICTS" -ne "0" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_CONFLICTS$GIT_CONFLICTS${RESET}"
    fi
    if [ "$GIT_CHANGED" -ne "0" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_CHANGED$GIT_CHANGED${RESET}"
    fi
    if [ "$GIT_UNTRACKED" -ne "0" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_UNTRACKED${RESET}"
    fi
    if [ "$GIT_CLEAN" -eq "1" ]; then
      STATUS="$STATUS$ZSH_THEME_GIT_PROMPT_CLEAN"
    fi
    STATUS="$STATUS${RESET}$ZSH_THEME_GIT_PROMPT_SUFFIX"
    echo " $STATUS"
  fi
}

# Default values for the appearance of the prompt. Configure at will.
ZSH_THEME_GIT_PROMPT_PREFIX="("
ZSH_THEME_GIT_PROMPT_SUFFIX=")"
ZSH_THEME_GIT_PROMPT_SEPARATOR=" "
ZSH_THEME_GIT_PROMPT_BRANCH="${BOLD}${MAGENTA}"
ZSH_THEME_GIT_PROMPT_STAGED="${GREEN}●"
ZSH_THEME_GIT_PROMPT_CONFLICTS="${RED}x"
ZSH_THEME_GIT_PROMPT_CHANGED="${RED}+"
ZSH_THEME_GIT_PROMPT_REMOTE=""
ZSH_THEME_GIT_PROMPT_UNTRACKED="…"
ZSH_THEME_GIT_PROMPT_CLEAN="${BOLD}${GREEN}✓"

update_current_git_vars
