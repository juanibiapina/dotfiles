create-puppet-module()
{
  if [ "$#" -ne "1" ]; then echo "Usage: puppet-module module_name" >&2; return 1; fi
  module_name="$1"

  (
  mkdir "$module_name"
  cd "$module_name"
  mkdir manifests
  cd manifests
  echo "class $module_name {" > init.pp
  echo "}" >> init.pp
  )
}
