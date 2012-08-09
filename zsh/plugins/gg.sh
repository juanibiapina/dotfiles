function gg()
{
    declare -A aliases
    aliases["d"]="$HOME/development/"
    aliases["bb"]="$HOME/development/brazil-build/"
    aliases["a"]="$HOME/development/alias/"
    aliases["a2"]="$HOME/development/alias2/"

    cd ${aliases["${1:-d}"]}
    pwd
}
