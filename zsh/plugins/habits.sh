alias habits='history | sed "s/^[[:space:]]*[0-9]*[[:space:]]*//" | sort | uniq -c | sort -n -r | head -n 10'
