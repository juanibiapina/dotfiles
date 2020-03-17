alias habits='history -1000 -1 | sed "s/^[[:space:]]*[0-9]*[[:space:]]*//" | sort | uniq -c | sort -n -r | head -n 30'
